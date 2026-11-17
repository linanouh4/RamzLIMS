import "server-only";
import {createClient} from "@supabase/supabase-js";

export async function publicReportIssue(code:string,pdf=false) {
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(code))return null;
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store"})}
  });
  const {data,error}=await db.rpc("report_issue_verify",{p_token:code,p_pdf:pdf});
  if(error)throw new Error("Verification temporarily unavailable");
  return data as {report_no:string;revision:number;issued_at:string;current:boolean;latest:string;pdf:string|null}|null;
}
