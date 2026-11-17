BEGIN;
CREATE SCHEMA IF NOT EXISTS report_vault;
REVOKE ALL ON SCHEMA report_vault FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS report_vault.issues (
  token uuid PRIMARY KEY,
  sample_id bigint NOT NULL REFERENCES public.samples(id),
  revision integer NOT NULL CHECK (revision > 0),
  report_no text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid NOT NULL,
  full_pdf bytea NOT NULL,
  results_pdf bytea NOT NULL,
  UNIQUE(sample_id, revision)
);
REVOKE ALL ON report_vault.issues FROM PUBLIC, anon, authenticated;
ALTER TABLE report_vault.issues ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION report_vault.allowed(p_sample bigint)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.users u
   JOIN public.samples s ON s.id = p_sample
   LEFT JOIN public.projects p ON p.id = s.project_id
   WHERE u.auth_user_id = auth.uid()
     AND (lower(trim(u.role)) = 'admin' OR
       (lower(trim(u.role)) = 'branch_manager' AND p.branch_id = u.branch_id))
 )
$$;

CREATE OR REPLACE FUNCTION public.report_issue_latest(p_sample bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT report_vault.allowed(p_sample) THEN RAISE EXCEPTION 'Access denied'; END IF;
 RETURN (SELECT jsonb_build_object('token',token,'revision',revision,'report_no',report_no)
 FROM report_vault.issues WHERE sample_id=p_sample ORDER BY revision DESC LIMIT 1);
END $$;

CREATE OR REPLACE FUNCTION public.report_issue_publish(p_sample bigint,p_token uuid,p_previous uuid,p_number text,p_full text,p_results text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE last_issue report_vault.issues%ROWTYPE; existing record; v_full bytea; v_results bytea; next_rev integer;
BEGIN
 IF NOT report_vault.allowed(p_sample) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.report_approvals WHERE sample_id=p_sample AND status='Approved' AND approved_by IS NOT NULL)
 THEN RAISE EXCEPTION 'Report approval required'; END IF;
 IF p_number IS NULL OR length(trim(p_number)) NOT BETWEEN 1 AND 100 OR p_token IS NULL
 OR p_full IS NULL OR p_results IS NULL OR greatest(length(p_full),length(p_results))>11200000
 THEN RAISE EXCEPTION 'Invalid report or file exceeds 8 MiB'; END IF;
 v_full := decode(p_full,'base64'); v_results := decode(p_results,'base64');
 IF substring(v_full from 1 for 5) <> decode('255044462d','hex') OR substring(v_results from 1 for 5) <> decode('255044462d','hex')
 OR greatest(octet_length(v_full),octet_length(v_results))>8388608 THEN RAISE EXCEPTION 'Invalid PDF'; END IF;
 PERFORM pg_advisory_xact_lock(p_sample);
 SELECT token,revision INTO last_issue.token,last_issue.revision FROM report_vault.issues
 WHERE sample_id=p_sample ORDER BY revision DESC LIMIT 1;
 SELECT revision, sample_id, report_no, issued_by,full_pdf=v_full AND results_pdf=v_results AS identical INTO existing
 FROM report_vault.issues WHERE token=p_token;
 IF FOUND THEN
   IF existing.sample_id=p_sample AND existing.identical AND existing.report_no=trim(p_number) AND existing.issued_by=auth.uid()
      AND last_issue.token=p_token THEN RETURN existing.revision; END IF;
   RAISE EXCEPTION 'Issue token conflict';
 END IF;
 IF last_issue.token IS DISTINCT FROM p_previous THEN RAISE EXCEPTION 'A newer issue exists. Refresh the page.'; END IF;
 next_rev:=coalesce(last_issue.revision,0)+1;
 INSERT INTO report_vault.issues(token,sample_id,revision,report_no,issued_by,full_pdf,results_pdf)
 VALUES(p_token,p_sample,next_rev,trim(p_number),auth.uid(),v_full,v_results);
 RETURN next_rev;
END $$;

CREATE OR REPLACE FUNCTION public.report_issue_download(p_token uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 RETURN (SELECT replace(encode(full_pdf,'base64'),chr(10),'') FROM report_vault.issues i
 WHERE token=p_token AND report_vault.allowed(i.sample_id));
END $$;

CREATE OR REPLACE FUNCTION public.report_issue_verify(p_token uuid, p_pdf boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object('report_no',i.report_no,'revision',i.revision,'issued_at',i.issued_at,
 'current',i.token=latest.token,'latest',latest.token,'pdf',
 CASE WHEN p_pdf AND latest.token=i.token THEN replace(encode(i.results_pdf,'base64'),chr(10),'') END)
 FROM report_vault.issues i
 CROSS JOIN LATERAL (SELECT n.token FROM report_vault.issues n WHERE n.sample_id=i.sample_id ORDER BY n.revision DESC LIMIT 1) latest
 WHERE i.token=p_token
$$;

REVOKE ALL ON FUNCTION report_vault.allowed(bigint), public.report_issue_latest(bigint), public.report_issue_download(uuid),
 public.report_issue_publish(bigint,uuid,uuid,text,text,text),public.report_issue_verify(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.report_issue_latest(bigint),public.report_issue_download(uuid),public.report_issue_publish(bigint,uuid,uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_issue_verify(uuid,boolean) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
