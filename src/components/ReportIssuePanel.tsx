"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import { base64, prepareReport } from "@/lib/reportIssuePdf";

type Issue = {token:string; revision:number; report_no:string};
type Preview = {token:string; previous:string|null; number:string; full:Blob; results:Blob; fullUrl:string; resultsUrl:string; origin:string};
function publicOrigin() {
  const configured = process.env.NEXT_PUBLIC_REPORT_VERIFY_ORIGIN;
  const url = new URL(configured || window.location.origin);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      !["https:", "http:"].includes(url.protocol)) throw Error("Invalid verification origin / عنوان التحقق غير صالح");
  return url.origin;
}
function isPublishable(origin:string) {
  const url=new URL(origin);
  return url.protocol==="https:" && !/^(localhost$|127\.|0\.0\.0\.0$|\[::1\]$)/.test(url.hostname);
}
function errorText(e:unknown) {
  return typeof e==="object" && e && "message" in e ? String(e.message) : String(e);
}
export default function ReportIssuePanel({sampleId,approved}:{sampleId:number;approved:boolean}) {
  const {language}=useLanguage();
  const t=(ar:string,en:string)=>language==="ar"?ar:en;
  const [number,setNumber]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [pages,setPages]=useState("");
  const [left,setLeft]=useState("38.5"),[bottom,setBottom]=useState("8"),[size,setSize]=useState("24");
  const [issue,setIssue]=useState<Issue|null>(null),[ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [preview,setPreview]=useState<Preview|null>(null);
  const [reviewed,setReviewed]=useState(false);
  useEffect(()=>{
    let active=true;
    void supabase.rpc("report_issue_latest",{p_sample:sampleId}).then(({data,error})=>{
      if(!active)return;
      if(error){setError(error.message);return;}
      setIssue(data);setNumber(data?.report_no || "");setReady(true);
    });
    return ()=>{active=false;};
  },[sampleId]);
  useEffect(()=>()=>{if(preview){URL.revokeObjectURL(preview.fullUrl);URL.revokeObjectURL(preview.resultsUrl);}},[preview]);
  function invalidate(){setReviewed(false);setPreview(null);setError("");}
  async function makePreview(){
    if(!file || !number.trim())return;
    invalidate();setBusy(true);
    try {
      if(file.size>8*1024*1024)throw Error(t("الحد الأقصى للملف ٨ ميجابايت","Maximum file size: 8 MiB"));
      const token=crypto.randomUUID(), origin=publicOrigin();
      const pdf=await prepareReport(file,pages,origin+"/report-check/"+token,Number(left),Number(bottom),Number(size));
      setPreview({...pdf,token,origin,number:number.trim(),previous:issue?.token || null,fullUrl:URL.createObjectURL(pdf.full),resultsUrl:URL.createObjectURL(pdf.results)});
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function publish(){
    if(!preview || !approved || !reviewed || !isPublishable(preview.origin))return;
    setBusy(true);setError("");
    try{
      const [full,results]=await Promise.all([base64(preview.full),base64(preview.results)]);
      const {data,error}=await supabase.rpc("report_issue_publish",{p_sample:sampleId,p_token:preview.token,p_previous:preview.previous,p_number:preview.number,p_full:full,p_results:results});
      if(error)throw error;
      setIssue({token:preview.token,revision:Number(data),report_no:preview.number});setPreview(null);
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function download(){
    if(!issue)return;
    setBusy(true);setError("");
    try{
      const {data,error}=await supabase.rpc("report_issue_download",{p_token:issue.token});if(error||!data)throw error||Error("File unavailable");
      const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
      const url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
      const a=document.createElement("a");a.href=url;a.download=issue.report_no.replace(/[^\p{L}\p{N}_.-]/gu,"-")+"-v"+issue.revision+".pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  const input="mt-1 block w-full rounded border p-2";
  const btn="rounded bg-blue-800 px-4 py-2 text-white disabled:opacity-50";
  return <section className="mx-auto mb-5 max-w-5xl rounded-xl bg-white p-6 shadow print:hidden">
    <h2 className="mb-3 text-xl font-bold">{t("إصدار تقرير PDF برمز تحقق","Issue a PDF with a verification QR")}</h2>
    {issue && <div className="mb-4 flex flex-wrap items-center gap-4"><strong>{issue.report_no} · {t("الإصدار","Version")} {issue.revision}</strong>
      <button type="button" disabled={busy} onClick={download} className={btn}>{t("تنزيل النسخة الكاملة الصادرة","Download issued PDF")}</button>
      <a target="_blank" rel="noreferrer" className="underline" href={"/report-check/"+issue.token}>{t("صفحة التحقق","Verification page")}</a></div>}
    <fieldset disabled={busy || !ready} onChange={invalidate} className="grid gap-3 sm:grid-cols-2">
      <label>{t("رقم التقرير كما في الملف","Report number as printed")}<input className={input} maxLength={100} value={number} onChange={e=>setNumber(e.target.value)}/></label>
      <label>{t("PDF غير محمي، قبل إضافة رمز التحقق","Unprotected PDF without a verification QR")}<input className={input} type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0] || null)}/></label>
      <label className="sm:col-span-2">{t("صفحات النتائج التي يراها العميل ويُطبع عليها الرمز، مثل 1-2 أو 1,3","Result pages to stamp and share, e.g. 1-2 or 1,3")}<input className={input} dir="ltr" value={pages} onChange={e=>setPages(e.target.value)} /></label>
      <details className="sm:col-span-2"><summary>{t("ضبط موضع الرمز وحجمه","QR position and size")}</summary>
      <div className="grid gap-2 sm:grid-cols-3">
        {[[t("من اليسار ٪","From left %"),left,setLeft],[t("من الأسفل ٪","From bottom %"),bottom,setBottom],[t("طول الضلع بالملليمتر","Side length in mm"),size,setSize]].map(([label,value,setter])=><label key={String(label)}>{String(label)}<input className={input} type="number" step="0.1" value={String(value)} onChange={e=>(setter as (v:string)=>void)(e.target.value)}/></label>)}
      </div></details>
      <button type="button" className={btn} disabled={!file||!number.trim()||!pages.trim()} onClick={makePreview}>{t("تجهيز المعاينة","Prepare preview")}</button>
    </fieldset>
    {preview && <div className="mt-4 space-y-3">
      <p>{t("راجعي النتائج والختم والتوقيع وموضع الرمز في النسختين.","Check the results, stamp, signatures and QR placement in both previews.")}</p>
      <div className="flex gap-5"><a className="underline" href={preview.resultsUrl} target="_blank" rel="noreferrer">{t("معاينة ما يراه العميل","Preview customer copy")}</a>
      <a className="underline" href={preview.fullUrl} target="_blank" rel="noreferrer">{t("معاينة الملف الكامل","Preview complete PDF")}</a></div>
      <label className="block"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> {t("راجعت الصفحات وأوافق على إتاحتها لحامل الرمز.","I reviewed the selected pages and approve sharing them with the QR holder.")}</label>
      {!isPublishable(preview.origin) && <p>{t("المعاينة المحلية جاهزة. للإصدار استخدمي عنوان المختبر المنشور عبر HTTPS.","Preview ready. Issue from the laboratory’s published HTTPS address.")}</p>}
      {!approved && <p>{t("احفظي اعتماد التقرير وحدّثي الصفحة قبل الإصدار.","Save the report approval and refresh before issuing.")}</p>}
      <button className={btn} disabled={busy||!approved||!reviewed||!isPublishable(preview.origin)} onClick={publish}>{issue?t("إصدار نسخة تحل محل السابقة","Issue replacement"):t("اعتماد وإصدار PDF","Approve and issue PDF")}</button>
    </div>}
    {busy && <p role="status">{t("جارٍ التنفيذ…","Working…")}</p>}
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </section>;
}
