import { publicReportIssue } from "@/lib/publicReportIssue";
export const dynamic="force-dynamic";
export async function GET(_req: Request,{params}:{params:Promise<{code:string}>}){
  const {code}=await params;
  const report=await publicReportIssue(code,true);
  const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, noarchive","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
  if(!report)return new Response(null,{status:404,headers});
  if(!report.current||!report.pdf)return new Response("Replaced / تم الاستبدال",{status:410,headers});
  return new Response(new Uint8Array(Buffer.from(report.pdf,"base64")),{headers:{...headers,"Content-Type":"application/pdf","Content-Disposition":"inline; filename=verified-results.pdf"}});
}
