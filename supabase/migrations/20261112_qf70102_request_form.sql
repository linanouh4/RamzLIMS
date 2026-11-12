BEGIN;

ALTER TABLE public.external_test_requests
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS sample_type text,
  ADD COLUMN IF NOT EXISTS sample_quantity_or_weight text,
  ADD COLUMN IF NOT EXISTS saac_scope_status text,
  ADD COLUMN IF NOT EXISTS customer_requirements_clear boolean,
  ADD COLUMN IF NOT EXISTS method_suitable_and_current boolean,
  ADD COLUMN IF NOT EXISTS laboratory_sampling_required boolean,
  ADD COLUMN IF NOT EXISTS conformity_statement_requested boolean,
  ADD COLUMN IF NOT EXISTS customer_method_unsuitable boolean,
  ADD COLUMN IF NOT EXISTS technical_review_decision text,
  ADD COLUMN IF NOT EXISTS results_delivery_method text,
  ADD COLUMN IF NOT EXISTS customer_approval_method text,
  ADD COLUMN IF NOT EXISTS customer_approval_evidence text,
  ADD COLUMN IF NOT EXISTS execution_decision text;

CREATE UNIQUE INDEX IF NOT EXISTS qf70102_approval_token_unique
  ON public.external_test_requests (approval_token) WHERE approval_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.qf70102_guard_request()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
DECLARE
  actor public.users%ROWTYPE;
  technical_changed boolean;
  manager_changed boolean;
  customer_changed boolean;
  customer_rpc boolean;
BEGIN
  SELECT u.* INTO actor FROM public.users u WHERE u.auth_user_id = auth.uid();
  customer_rpc := current_user = 'postgres'
    AND COALESCE(current_setting('ramzlims.qf70102_customer_approval', true), '') = 'on';

  IF TG_OP = 'INSERT' THEN
    IF NEW.technical_review_status IS DISTINCT FROM 'Pending'
       OR NEW.lab_manager_approval_status IS DISTINCT FROM 'Pending'
       OR NEW.customer_approval_status IS DISTINCT FROM 'Pending'
       OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL
       OR NEW.technical_reviewed_by_name IS NOT NULL
       OR NEW.technical_manager_signature IS NOT NULL OR NEW.technical_manager_stamp IS NOT NULL
       OR NEW.lab_manager_approved_by IS NOT NULL OR NEW.lab_manager_approved_at IS NOT NULL
       OR NEW.lab_manager_approved_by_name IS NOT NULL OR NEW.lab_manager_signature IS NOT NULL
       OR NEW.customer_approved_by IS NOT NULL OR NEW.customer_approved_at IS NOT NULL
       OR NEW.customer_signed_at IS NOT NULL OR NEW.customer_signature IS NOT NULL
       OR NEW.customer_approval_method IS NOT NULL OR NEW.customer_approval_evidence IS NOT NULL
       OR NEW.execution_decision IS NOT NULL OR NEW.technical_review_decision IS NOT NULL THEN
      RAISE EXCEPTION 'يجب إنشاء الطلب دون موافقات أو توقيعات مسبقة.';
    END IF;
    NEW.status := 'Draft';
    NEW.created_at := now();
  ELSE
    IF ROW(NEW.id, NEW.project_id, NEW.client_id, NEW.approval_token, NEW.request_no, NEW.created_at)
       IS DISTINCT FROM ROW(OLD.id, OLD.project_id, OLD.client_id, OLD.approval_token, OLD.request_no, OLD.created_at) THEN
      RAISE EXCEPTION 'لا يمكن تغيير هوية الطلب أو ارتباطه أو رابط الموافقة.';
    END IF;
    IF OLD.lab_manager_approval_status = 'Approved' THEN
      RAISE EXCEPTION 'الطلب معتمد للتنفيذ ولا يمكن تعديله.';
    END IF;
    IF OLD.customer_approval_status = 'Approved' AND
       ROW(NEW.customer_name, NEW.project_name, NEW.order_no, NEW.request_date, NEW.contact_person,
           NEW.telephone, NEW.sample_kind, NEW.quantity, NEW.requested_test, NEW.test_method,
           NEW.payment_method, NEW.sample_type, NEW.sample_quantity_or_weight, NEW.sample_code,
           NEW.sample_receiving_date, NEW.results_delivery_date, NEW.results_delivery_method)
       IS DISTINCT FROM
       ROW(OLD.customer_name, OLD.project_name, OLD.order_no, OLD.request_date, OLD.contact_person,
           OLD.telephone, OLD.sample_kind, OLD.quantity, OLD.requested_test, OLD.test_method,
           OLD.payment_method, OLD.sample_type, OLD.sample_quantity_or_weight, OLD.sample_code,
           OLD.sample_receiving_date, OLD.results_delivery_date, OLD.results_delivery_method) THEN
      RAISE EXCEPTION 'لا يمكن تغيير بيانات الطلب بعد موافقة العميل.';
    END IF;

    technical_changed := ROW(NEW.technical_review_status, NEW.reviewed_by, NEW.reviewed_at,
      NEW.technical_reviewed_by_name, NEW.technical_manager_signature,
      NEW.saac_scope_status, NEW.sample_status, NEW.rejection_reason, NEW.customer_requirements_clear,
      NEW.method_suitable_and_current, NEW.laboratory_sampling_required, NEW.conformity_statement_requested,
      NEW.customer_method_unsuitable, NEW.technical_review_decision, NEW.technical_review_notes)
      IS DISTINCT FROM ROW(OLD.technical_review_status, OLD.reviewed_by, OLD.reviewed_at,
      OLD.technical_reviewed_by_name, OLD.technical_manager_signature,
      OLD.saac_scope_status, OLD.sample_status, OLD.rejection_reason, OLD.customer_requirements_clear,
      OLD.method_suitable_and_current, OLD.laboratory_sampling_required, OLD.conformity_statement_requested,
      OLD.customer_method_unsuitable, OLD.technical_review_decision, OLD.technical_review_notes);
    manager_changed := ROW(NEW.lab_manager_approval_status, NEW.lab_manager_approved_by,
      NEW.lab_manager_approved_at, NEW.lab_manager_approved_by_name, NEW.lab_manager_signature, NEW.execution_decision)
      IS DISTINCT FROM ROW(OLD.lab_manager_approval_status, OLD.lab_manager_approved_by,
      OLD.lab_manager_approved_at, OLD.lab_manager_approved_by_name, OLD.lab_manager_signature, OLD.execution_decision);
    customer_changed := ROW(NEW.customer_approval_status, NEW.customer_approved_by, NEW.customer_approved_at,
      NEW.customer_signature, NEW.customer_signed_at, NEW.customer_ip, NEW.customer_approval_method, NEW.customer_approval_evidence)
      IS DISTINCT FROM ROW(OLD.customer_approval_status, OLD.customer_approved_by, OLD.customer_approved_at,
      OLD.customer_signature, OLD.customer_signed_at, OLD.customer_ip, OLD.customer_approval_method, OLD.customer_approval_evidence);

    IF NEW.technical_manager_stamp IS DISTINCT FROM OLD.technical_manager_stamp AND
       (actor.id IS DISTINCT FROM 1 OR lower(trim(actor.role)) IS DISTINCT FROM 'admin' OR customer_rpc) THEN
      RAISE EXCEPTION 'رفع ختم الشركة مخصص لحساب مديرة المختبر.';
    END IF;

    IF technical_changed THEN
      IF lower(trim(actor.role)) IS DISTINCT FROM 'technical_manager' OR customer_rpc THEN
        RAISE EXCEPTION 'المراجعة الفنية مخصصة للمدير الفني.';
      END IF;
      IF OLD.technical_review_status = 'Approved' THEN
        RAISE EXCEPTION 'المراجعة الفنية موقعة مسبقًا.';
      END IF;
      IF NEW.technical_review_decision IS NULL OR NEW.technical_review_decision NOT IN ('قبول', 'قبول بشرط', 'رفض')
         OR NEW.saac_scope_status IS NULL OR NEW.saac_scope_status NOT IN ('ضمن النطاق الساري', 'خارج النطاق الساري')
         OR NEW.sample_status IS NULL OR NEW.sample_status NOT IN ('مقبولة', 'مقبولة بتحفظ', 'مرفوضة')
         OR NEW.customer_requirements_clear IS NULL OR NEW.method_suitable_and_current IS NULL
         OR NEW.laboratory_sampling_required IS NULL OR NEW.conformity_statement_requested IS NULL
         OR NEW.customer_method_unsuitable IS NULL THEN
        RAISE EXCEPTION 'يرجى استكمال حقول المراجعة الفنية.';
      END IF;
      IF NEW.sample_status IN ('مقبولة بتحفظ','مرفوضة') AND NULLIF(trim(NEW.rejection_reason),'') IS NULL THEN
        RAISE EXCEPTION 'يلزم وصف الخلل أو التحفظ.';
      END IF;
      IF (NEW.technical_review_decision <> 'قبول' OR NEW.customer_method_unsuitable
          OR NOT NEW.customer_requirements_clear OR NOT NEW.method_suitable_and_current)
         AND NULLIF(trim(NEW.technical_review_notes),'') IS NULL THEN
        RAISE EXCEPTION 'يلزم توثيق الشروط والفروق أو أسباب القرار.';
      END IF;
      IF NEW.sample_status = 'مرفوضة' AND NEW.technical_review_decision <> 'رفض' THEN
        RAISE EXCEPTION 'العينة المرفوضة تحتاج قرارًا فنيًا بالرفض.';
      END IF;
      IF NULLIF(trim(actor.signature),'') IS NULL THEN RAISE EXCEPTION 'يلزم توقيع محفوظ للمدير الفني.'; END IF;
      NEW.technical_review_status := CASE WHEN NEW.technical_review_decision = 'رفض' THEN 'Rejected' ELSE 'Approved' END;
      NEW.reviewed_by := actor.id;
      NEW.reviewed_at := now();
      NEW.technical_reviewed_by_name := COALESCE(NULLIF(actor.full_name,''), actor.username);
      NEW.technical_manager_signature := actor.signature;
      NEW.technical_manager_stamp := OLD.technical_manager_stamp;
    END IF;

    IF customer_changed THEN
      IF OLD.customer_approval_status = 'Approved' THEN RAISE EXCEPTION 'موافقة العميل مسجلة مسبقًا.'; END IF;
      IF customer_rpc THEN
        IF NEW.customer_approval_method IS DISTINCT FROM 'توقيع'
           OR NULLIF(trim(NEW.customer_signature),'') IS NULL THEN
          RAISE EXCEPTION 'يلزم توقيع العميل.';
        END IF;
        NEW.customer_signed_at := now();
      ELSE
        IF lower(trim(actor.role)) IS NULL OR lower(trim(actor.role)) NOT IN ('admin','technical_manager','branch_manager','reception') THEN
          RAISE EXCEPTION 'ليس لديك صلاحية توثيق موافقة العميل.';
        END IF;
        IF NEW.customer_approval_method IS NULL OR NEW.customer_approval_method NOT IN ('واتساب/بريد موثق','أمر شراء')
           OR NULLIF(trim(NEW.customer_approval_evidence),'') IS NULL
           OR NEW.customer_signature IS NOT NULL OR NEW.customer_signed_at IS NOT NULL THEN
          RAISE EXCEPTION 'يلزم مرجع رسالة الموافقة أو أمر الشراء. توقيع العميل يسجل من رابط الموافقة.';
        END IF;
      END IF;
      IF NULLIF(trim(NEW.customer_approved_by),'') IS NULL THEN RAISE EXCEPTION 'يلزم اسم ممثل العميل.'; END IF;
      NEW.customer_approval_status := 'Approved';
      NEW.customer_approved_at := now();
      NEW.customer_ip := OLD.customer_ip;
    END IF;

    IF manager_changed THEN
      IF actor.id IS DISTINCT FROM 1 OR lower(trim(actor.role)) IS DISTINCT FROM 'admin' OR customer_rpc THEN
        RAISE EXCEPTION 'قرار التنفيذ مخصص لحساب مديرة المختبر لينا نوح.';
      END IF;
      IF NEW.execution_decision IS NULL OR NEW.execution_decision NOT IN ('مقبول للتنفيذ','مرفوض','معلق حتى استكمال بيانات') THEN
        RAISE EXCEPTION 'يرجى اختيار قرار التنفيذ.';
      END IF;
      IF NEW.execution_decision = 'مقبول للتنفيذ' AND
         (NEW.technical_review_status IS DISTINCT FROM 'Approved' OR NEW.customer_approval_status IS DISTINCT FROM 'Approved') THEN
        RAISE EXCEPTION 'يلزم قبول المراجعة الفنية وموافقة العميل قبل قبول التنفيذ.';
      END IF;
      IF NULLIF(trim(actor.signature),'') IS NULL THEN RAISE EXCEPTION 'يلزم توقيع محفوظ لمديرة المختبر.'; END IF;
      NEW.lab_manager_approval_status := CASE NEW.execution_decision WHEN 'مقبول للتنفيذ' THEN 'Approved' WHEN 'مرفوض' THEN 'Rejected' ELSE 'Pending' END;
      NEW.lab_manager_approved_by := actor.id;
      NEW.lab_manager_approved_at := now();
      NEW.lab_manager_approved_by_name := COALESCE(NULLIF(actor.full_name,''),actor.username);
      NEW.lab_manager_signature := actor.signature;
    END IF;
    NEW.status := CASE
      WHEN NEW.lab_manager_approval_status = 'Rejected' OR NEW.technical_review_status = 'Rejected' THEN 'Rejected'
      WHEN NEW.lab_manager_approval_status = 'Approved' THEN 'Approved'
      WHEN NEW.customer_approval_status = 'Approved' THEN 'Customer Approved'
      WHEN NEW.technical_review_status = 'Approved' OR NEW.execution_decision IS NOT NULL THEN 'Pending'
      ELSE 'Draft' END;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_qf70102_guard_request ON public.external_test_requests;
CREATE TRIGGER trg_qf70102_guard_request BEFORE INSERT OR UPDATE ON public.external_test_requests
  FOR EACH ROW EXECUTE FUNCTION public.qf70102_guard_request();

CREATE OR REPLACE FUNCTION public.qf70102_customer_request(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE r public.external_test_requests%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 20 THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.external_test_requests WHERE approval_token::text = trim(p_token);
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'updated_at',r.updated_at, 'id',r.id, 'request_no',r.request_no, 'project_name',COALESCE(r.project_name, (SELECT p.project_name FROM public.projects p WHERE p.id = r.project_id)), 'customer_name',r.customer_name,
    'order_no',r.order_no, 'request_date',r.request_date, 'contact_person',r.contact_person, 'telephone',r.telephone,
    'sample_kind',r.sample_kind, 'quantity',r.quantity, 'requested_test',r.requested_test, 'test_method',r.test_method,
    'payment_method',r.payment_method, 'status',r.status, 'sample_type',r.sample_type,
    'sample_quantity_or_weight',r.sample_quantity_or_weight, 'sample_receiving_date',r.sample_receiving_date,
    'sample_code',r.sample_code, 'results_delivery_date',r.results_delivery_date, 'results_delivery_method',r.results_delivery_method,
    'saac_scope_status',r.saac_scope_status, 'sample_status',r.sample_status, 'rejection_reason',r.rejection_reason,
    'customer_requirements_clear',r.customer_requirements_clear, 'method_suitable_and_current',r.method_suitable_and_current,
    'laboratory_sampling_required',r.laboratory_sampling_required, 'conformity_statement_requested',r.conformity_statement_requested,
    'customer_method_unsuitable',r.customer_method_unsuitable, 'technical_review_decision',r.technical_review_decision,
    'technical_review_notes',r.technical_review_notes, 'technical_review_status',r.technical_review_status,
    'technical_reviewed_by_name',r.technical_reviewed_by_name, 'technical_manager_signature',r.technical_manager_signature,
    'reviewed_at',r.reviewed_at, 'customer_approval_status',r.customer_approval_status,
    'customer_approved_by',r.customer_approved_by, 'customer_approved_at',r.customer_approved_at, 'customer_signature',r.customer_signature,
    'customer_approval_method',r.customer_approval_method, 'customer_approval_evidence',r.customer_approval_evidence,
    'lab_manager_approval_status',r.lab_manager_approval_status, 'lab_manager_approved_by_name',r.lab_manager_approved_by_name,
    'lab_manager_approved_at',r.lab_manager_approved_at, 'lab_manager_signature',r.lab_manager_signature, 'execution_decision',r.execution_decision
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.qf70102_approve_customer(p_token text, p_name text, p_signature text, p_accept_terms boolean, p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE r public.external_test_requests%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 20 THEN RAISE EXCEPTION 'رابط الموافقة غير صحيح.'; END IF;
  IF p_accept_terms IS DISTINCT FROM true OR NULLIF(trim(p_name),'') IS NULL OR length(p_name) > 300 THEN
    RAISE EXCEPTION 'يلزم اسم العميل والموافقة على الشروط.';
  END IF;
  IF p_signature IS NULL OR length(p_signature) > 2000000 OR p_signature !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' THEN
    RAISE EXCEPTION 'صيغة التوقيع غير صحيحة.';
  END IF;
  SELECT * INTO r FROM public.external_test_requests WHERE approval_token::text = trim(p_token) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير موجود.'; END IF;
  IF r.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'تغيرت بيانات الطلب. حدّث الصفحة واقرأ البيانات قبل التوقيع.'; END IF;
  IF r.customer_approval_status = 'Approved' THEN RAISE EXCEPTION 'موافقة العميل مسجلة مسبقًا. حدّث الصفحة.'; END IF;
  IF r.lab_manager_approval_status = 'Approved' THEN RAISE EXCEPTION 'الطلب معتمد للتنفيذ.'; END IF;
  PERFORM set_config('ramzlims.qf70102_customer_approval','on',true);
  UPDATE public.external_test_requests SET
    customer_approval_status = 'Approved', customer_approved_by = trim(p_name), customer_approved_at = now(),
    customer_signature = p_signature, customer_approval_method = 'توقيع', customer_approval_evidence = NULL
    WHERE id = r.id;
  PERFORM set_config('ramzlims.qf70102_customer_approval','off',true);
  RETURN public.qf70102_customer_request(p_token);
END;
$fn$;

REVOKE ALL ON FUNCTION public.qf70102_customer_request(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qf70102_approve_customer(text,text,text,boolean,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qf70102_customer_request(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qf70102_approve_customer(text,text,text,boolean,timestamptz) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.qf70102_guard_request() FROM PUBLIC;

DROP POLICY IF EXISTS "Allow insert external test requests" ON public.external_test_requests;
DROP POLICY IF EXISTS "Allow select external test requests" ON public.external_test_requests;
DROP POLICY IF EXISTS "Allow update external test requests" ON public.external_test_requests;
DROP POLICY IF EXISTS "Public can view contract by approval token" ON public.external_test_requests;
DROP POLICY IF EXISTS "Public can approve contract" ON public.external_test_requests;

DROP POLICY IF EXISTS qf70102_staff_read ON public.external_test_requests;
CREATE POLICY qf70102_staff_read ON public.external_test_requests FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (
    lower(trim(u.role)) IN ('admin','technical_manager','quality_manager','lab_manager','reception','accountant')
    OR (lower(trim(u.role)) = 'branch_manager' AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = external_test_requests.project_id AND p.branch_id = u.branch_id))
    OR (lower(trim(u.role)) = 'technician' AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.project_id = external_test_requests.project_id AND t.technician_id = u.id))
  ))
);
DROP POLICY IF EXISTS qf70102_staff_insert ON public.external_test_requests;
CREATE POLICY qf70102_staff_insert ON public.external_test_requests FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (
    lower(trim(u.role)) IN ('admin','technical_manager','reception')
    OR (lower(trim(u.role)) = 'branch_manager' AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = external_test_requests.project_id AND p.branch_id = u.branch_id))
  ))
);
DROP POLICY IF EXISTS qf70102_staff_update ON public.external_test_requests;
CREATE POLICY qf70102_staff_update ON public.external_test_requests FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (
    lower(trim(u.role)) IN ('admin','technical_manager','reception')
    OR (lower(trim(u.role)) = 'branch_manager' AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = external_test_requests.project_id AND p.branch_id = u.branch_id))
  ))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (
    lower(trim(u.role)) IN ('admin','technical_manager','reception')
    OR (lower(trim(u.role)) = 'branch_manager' AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = external_test_requests.project_id AND p.branch_id = u.branch_id))
  ))
);
ALTER TABLE public.external_test_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.external_test_requests FROM anon, PUBLIC;
REVOKE TRUNCATE, TRIGGER, REFERENCES, DELETE ON TABLE public.external_test_requests FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.external_test_requests TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
