import { notFound } from "next/navigation";
import { publicReportIssue } from "@/lib/publicReportIssue";
export const dynamic="force-dynamic";
export const metadata={title:"التحقق من تقرير المختبر | Report verification",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function VerifyReport({params}:{params:Promise<{code:string}>}){
  const {code}=await params, report=await publicReportIssue(code);
  if(!report)notFound();
  const pdf="/report-check/"+code+"/pdf";
  return <main dir="rtl" className="mx-auto w-full max-w-5xl p-4">
    <h1 className="text-xl font-bold">التحقق من تقرير المختبر · Report verification</h1>
    <p className="my-3">{report.report_no} · إصدار / Version {report.revision} · {new Date(report.issued_at).toLocaleDateString("en-GB",{timeZone:"Asia/Riyadh"})}</p>
    {report.current?<><p className="mb-2 font-bold text-green-800">إصدار ساري · Current issue</p>
      <a className="text-blue-800 underline" href={pdf}>فتح صفحات النتائج المعتمدة · Open verified results</a>
      <iframe className="mt-3 h-[75vh] w-full border" src={pdf} title="نتائج التقرير المعتمدة / Verified report results"/></>:
      <><p className="font-bold text-amber-800">تم استبدال هذا الإصدار · This issue has been superseded</p>
      <a className="text-blue-800 underline" href={"/report-check/"+report.latest}>عرض الإصدار الحالي · View current issue</a></>}
  </main>;
}
