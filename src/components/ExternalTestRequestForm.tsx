"use client";

import { useUiText } from "@/lib/uiText";
export type RequestDraft = Record<string, string>;
type Field = { key: string; label: string; type?: "date" | "boolean" | "textarea"; options?: readonly string[] };

export const requestFields: Field[] = [
  { key: "sample_type", label: "نوع العينات / Sample type" },
  { key: "sample_quantity_or_weight", label: "كمية العينة أو وزنها مع الوحدة" },
  { key: "sample_receiving_date", label: "تاريخ الاختبار أو استلام العينات", type: "date" },
  { key: "sample_code", label: "كود العينة" },
  { key: "results_delivery_date", label: "تاريخ تسليم النتائج أو التقرير", type: "date" },
  { key: "results_delivery_method", label: "طريقة تسليم النتائج", options: ["نسخة ورقية باليد", "نسخة إلكترونية واتساب", "نسخة إلكترونية بالبريد", "ورقي وإلكتروني"] },
];
export const reviewFields: Field[] = [
  { key: "saac_scope_status", label: "حالة الاختبار في نطاق اعتماد SAAC الساري", options: ["ضمن النطاق الساري", "خارج النطاق الساري"] },
  { key: "sample_status", label: "حالة العينة عند الاستلام", options: ["مقبولة", "مرفوضة", "مقبولة بتحفظ"] },
  { key: "rejection_reason", label: "وصف أي خلل أو اختلاف عن شروط الاستلام / التحفظات", type: "textarea" },
  { key: "customer_requirements_clear", label: "وضوح متطلبات العميل وطريقة الاختبار", type: "boolean" },
  { key: "method_suitable_and_current", label: "ملاءمة الطريقة وتوافر إصدارها الساري", type: "boolean" },
  { key: "laboratory_sampling_required", label: "هل يشمل الطلب أخذ عينات بواسطة المختبر؟", type: "boolean" },
  { key: "conformity_statement_requested", label: "هل يطلب العميل بيان مطابقة؟", type: "boolean" },
  { key: "customer_method_unsuitable", label: "هل توجد طريقة طلبها العميل غير مناسبة؟", type: "boolean" },
  { key: "technical_review_decision", label: "نتيجة المراجعة الفنية", options: ["قبول", "قبول بشرط", "رفض"] },
  { key: "technical_review_notes", label: "تفاصيل المراجعة والشروط والفروق الموثقة", type: "textarea" },
];
export const approvalFields: Field[] = [
  { key: "customer_approval_method", label: "طريقة موافقة العميل", options: ["توقيع", "واتساب/بريد موثق", "أمر شراء"] },
  { key: "customer_approval_evidence", label: "مرجع الموافقة الموثقة أو رقم أمر الشراء", type: "textarea" },
];


export function toDraft(record: Record<string, any>, fields: Field[]): RequestDraft {
  return Object.fromEntries(fields.map(field => [field.key,
    typeof record[field.key] === "boolean" ? String(record[field.key]) : String(record[field.key] ?? "")
  ]));
}
export function toPayload(draft: RequestDraft, fields: Field[]) {
  return Object.fromEntries(fields.map(field => [field.key,
    field.type === "boolean" ? (draft[field.key] === "" || draft[field.key] == null ? null : draft[field.key] === "true")
      : draft[field.key]?.trim() || null
  ]));
}
export function validateReview(draft: RequestDraft, ui = (value: string) => value): string | null {
  const missing = reviewFields.find(field => (field.type === "boolean" || field.options) &&
    (!draft[field.key] || (field.options && !field.options.includes(draft[field.key]))));
  if (missing) return ui("يرجى استكمال ") + ui(missing.label);
  if ((draft.sample_status === "مرفوضة" || draft.sample_status === "مقبولة بتحفظ") && !draft.rejection_reason?.trim()) {
    return ui("يرجى وصف الخلل أو التحفظ عند استلام العينة.");
  }
  if ((draft.technical_review_decision !== "قبول" || draft.customer_method_unsuitable === "true" ||
       draft.customer_requirements_clear === "false" || draft.method_suitable_and_current === "false") && !draft.technical_review_notes?.trim()) {
    return ui("يرجى توثيق أسباب القرار أو الشروط والفروق في تفاصيل المراجعة.");
  }
  if (draft.sample_status === "مرفوضة" && draft.technical_review_decision !== "رفض") {
    return ui("العينة المرفوضة تحتاج نتيجة مراجعة فنية بالرفض.");
  }
  return null;
}
export function RequestFields({ fields, value, onChange, disabled = false }: {
  fields: Field[]; value: RequestDraft; onChange: (value: RequestDraft) => void; disabled?: boolean;
}) {
  const ui = useUiText();
  return <div className="grid gap-4 md:grid-cols-2">
    {fields.map(field => {
      const inputClass = "mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 disabled:bg-gray-100";
      const update = (text: string) => onChange({ ...value, [field.key]: text });
      return <label key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
        <span className="text-sm font-medium">{ui(field.label)}</span>
        {field.options || field.type === "boolean" ?
          <select value={value[field.key] ?? ""} disabled={disabled} onChange={event => update(event.target.value)} className={inputClass}>
            <option value="">{ui("اختاري")}</option>
            {field.type === "boolean" ? <><option value="true">{ui("نعم")}</option><option value="false">{ui("لا")}</option></> :
              field.options?.map(option => <option key={option} value={option}>{ui(option)}</option>)}
          </select> : field.type === "textarea" ?
          <textarea rows={3} value={value[field.key] ?? ""} disabled={disabled} onChange={event => update(event.target.value)} className={inputClass} /> :
          <input type={field.type || "text"} value={value[field.key] ?? ""} disabled={disabled} onChange={event => update(event.target.value)} className={inputClass} />}
      </label>;
    })}
  </div>;
}

const formLogo = "data:image/jpeg;base64,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";

const css = `
.qf701 { direction:rtl; font-family:Tahoma,Arial,sans-serif; color:#111; background:white; padding:20px; font-size:13px; line-height:1.6; }
.qf701 * { box-sizing:border-box; }
.qf701 header { display:flex; justify-content:space-between; gap:14px; border:1px solid #555; padding:10px; }
.qf701 header div { flex:1; }
.qf701 h2 { font-size:18px; text-align:center; margin:12px 0; }
.qf701 h3 { margin:14px 0 0; border:1px solid #777; background:#f1f1f1; padding:6px; font-size:14px; }
.qf701 table { border-collapse:collapse; width:100%; table-layout:fixed; }
.qf701 td { border:1px solid #999; padding:6px 8px; vertical-align:top; overflow-wrap:anywhere; white-space:pre-wrap; }
.qf701 td:first-child { width:42%; }
.qf701 .qf-signatures { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.qf701 .qf-signatures section { border:1px solid #999; padding:8px; break-inside:avoid; }
.qf701 img { max-width:100%; height:55px; object-fit:contain; margin:6px auto; display:block; }
.qf701 p { margin:5px 0; }
@media(max-width:640px) { .qf701 .qf-signatures { grid-template-columns:1fr; } }
@media print { @page { size:A4 portrait; margin:10mm; } .qf701 { padding:0; font-size:10px; line-height:1.35; } .qf701 h2 { font-size:15px; } .qf701 h3 { font-size:11px; } .qf701 td { padding:4px 6px; } .qf701 tr,.qf701 header { break-inside:avoid; } .qf701 .qf-signatures { grid-template-columns:repeat(3,minmax(0,1fr)); } .qf701 img { height:45px; } }
`;
function display(value: unknown) {
  if (value === true) return "نعم";
  if (value === false) return "لا";
  if (value == null || value === "" || value === "Pending") return "غير مسجل";
  return String(value);
}
function dateText(value: unknown) {
  if (!value) return "غير مسجل";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "غير مسجل" : date.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
}
export default function ExternalTestRequestForm({ request, projectName }: {
  request: Record<string, any>; projectName?: string;
}) {
  function rows(items: [string, unknown][]) {
    return items.map(([label, value]) => <tr key={label}><td>{label}</td><td>{display(value)}</td></tr>);
  }
  const signatures = [
    { title: "المراجع الفني المخول", name: request.technical_reviewed_by_name, date: request.reviewed_at, signature: request.technical_manager_signature, status: request.technical_review_status, decision: request.technical_review_decision },
    { title: "العميل أو ممثله المخول", name: request.customer_approved_by, date: request.customer_approved_at, signature: request.customer_signature, status: request.customer_approval_status, decision: request.customer_approval_method },
    { title: "صاحب الصلاحية / مدير المختبر", name: request.lab_manager_approved_by_name, date: request.lab_manager_approved_at, signature: request.lab_manager_signature, status: request.lab_manager_approval_status, decision: request.execution_decision },
  ];
  return <article className="qf701" id={`external-request-${request.id}`}>
    <style>{css}</style>
    <header><div><b>QF 701/02</b><br />الإصدار/المراجعة 2/4<br />تاريخ الإصدار 31/12/2023<br />تاريخ المراجعة 12/08/2026</div>
      <div style={{ textAlign: "center" }}><img src={formLogo} alt="شعار المختبر كما في النموذج المعتمد" /><b>طلب فحص خارجي</b><br />External Test Request Form<br />رقم الطلب {request.request_no}</div></header>
    <h2>بيانات العميل والطلب والعينات</h2>
    <table><tbody>{rows([
      ["اسم العميل / Customer name", request.customer_name],
      ["اسم المشروع أو رقم القطعة", projectName || request.project_name],
      ["مسؤول الاتصال / Contact person", request.contact_person], ["الهاتف / Telephone", request.telephone],
      ["تاريخ الاختبار أو استلام العينات", request.sample_receiving_date],
      ["تاريخ الطلب", request.request_date], ["رقم طلب العميل / Order No.", request.order_no],
      ["نوع العينات / Sample kind", request.sample_kind], ["عدد العينات / Quantity", request.quantity],
      ["الاختبار المطلوب / Requested test", request.requested_test],
      ["كمية العينة أو وزنها", request.sample_quantity_or_weight], ["نوع العينات / Sample type", request.sample_type],
      ["حالة الاختبار في نطاق اعتماد SAAC الساري", request.saac_scope_status],
      ["مواصفة الاختبار / Test method", request.test_method],
    ])}</tbody></table>
    <h3>بيانات تستكمل بواسطة المدير الفني للمختبر</h3>
    <table><tbody>{rows([
      ...reviewFields.filter(field => field.key !== "saac_scope_status").map(field => [field.label, request[field.key]] as [string, unknown]),
      ["كود العينة / Sample code", request.sample_code],
      ["طريقة الاختبار المستخدمة", request.test_method],
      ["تاريخ تسليم النتائج أو التقرير", request.results_delivery_date],
      ["طريقة تسليم النتائج", request.results_delivery_method],
      ["المسائل المالية", ({ Cash: "نقدي", Check: "شيك", "Bank Transfer": "تحويل بنكي", Account: "على الحساب" } as Record<string,string>)[request.payment_method] || request.payment_method],
      ["قرار مدير المختبر", request.execution_decision],
      ["مرجع الموافقة الموثقة أو أمر الشراء", request.customer_approval_evidence],
    ])}</tbody></table>
    <p>أوافق على الاختبارات والمواصفات والمدة والشروط المدونة أعلاه وأي فروق موثقة.</p>
    <div className="qf-signatures">{signatures.map(person => <section key={person.title}>
      <b>{person.title}</b><p>{display(person.name)}</p><p>{display(person.decision)}</p>
      <p>{dateText(person.date)}</p>
      <p>{person.status === "Approved" ? "تمت الموافقة" : person.status === "Rejected" ? "مرفوض" : person.status === "Pending" || !person.status ? "بانتظار المراجعة أو الموافقة" : display(person.status)}</p>
      {typeof person.signature === "string" && (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(person.signature) || /^https:\/\//i.test(person.signature)) && <img src={person.signature} alt={`توقيع ${person.title}`} />}
    </section>)}</div>
  </article>;
}
export function printExternalForm(id: number | string, ui = (value: string) => value) {
  const source = document.getElementById(`external-request-${id}`);
  if (!source) { alert(ui("تعذر تجهيز النموذج للطباعة. أعيدي فتح الطلب.")); return; }
  const popup = window.open("", "_blank", "width=1000,height=900");
  if (!popup) { alert(ui("يرجى السماح بالنوافذ المنبثقة للطباعة.")); return; }
  popup.opener = null;
  popup.document.open();
  popup.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>طلب فحص خارجي QF 701/02</title></head><body>' + source.outerHTML + '</body></html>');
  popup.document.close();
  const button = popup.document.createElement("button");
  button.textContent = ui("طباعة النموذج");
  button.style.cssText = "display:block;margin:12px auto;padding:10px 24px";
  button.onclick = () => popup.print();
  const style = popup.document.createElement("style");
  style.textContent = "@media print { body > button { display:none; } }";
  popup.document.head.appendChild(style);
  popup.document.body.appendChild(button);
  popup.focus();
}
