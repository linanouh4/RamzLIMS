import type { SavedQuote } from "./QuotationForm";

const price = new Intl.NumberFormat("ar-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function QuotationHeader() {
  return (
    <table dir="ltr" className="qf-head w-full border-collapse text-center text-black"
      style={{ fontFamily: "Arial, sans-serif", fontSize: "12px" }}>
      <tbody>
        <tr>
          <td className="border border-black p-1 text-left">Document code: QF 701/03</td>
          <td rowSpan={3} className="w-1/5 border border-black p-1">
            <img src="/quotation-assets/qf70103-logo.png"
              alt="شركة رمز الإمارات لفحص التربة والخرسانة"
              width={110} height={75}
              style={{ width: "95px", height: "auto", margin: "0 auto" }} />
          </td>
          <td rowSpan={3} className="border border-black p-2 font-bold">
            Controlled document /Quote
          </td>
          <td className="border border-black p-1 text-left">Issue/Rev # 2/4</td>
        </tr>
        <tr>
          <td className="border border-black p-1 text-left">Issue Date: 31/12/2023</td>
          <td className="border border-black p-1 text-left">Copy #</td>
        </tr>
        <tr>
          <td className="border border-black p-1 text-left">Revision Date: 12/08/2026</td>
          <td className="border border-black p-1 text-left">Page</td>
        </tr>
      </tbody>
    </table>
  );
}

function printImageUrl(value: string | null | undefined) {
  const src = value?.trim();
  if (!src || /[<>"\\\r\n]/.test(src)) return null;
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(src)) return src;
  try {
    const url = new URL(src, window.location.origin);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function QuotationPaper({ quote, total }: { quote: SavedQuote; total: number }) {
  const approved = quote.status === "Approved" && quote.approved_by === 1;
  const rows = quote.quotation_items;
  const signature = approved ? printImageUrl(quote.approval_signature) : null;
  const seal = approved ? printImageUrl(quote.approval_company_stamp) : null;
  const hasApprovalImages = Boolean(signature && seal);
  return (
    <article dir="rtl" className="qf-paper bg-white text-black">
      <style>{`
        .qf-paper { font-family: Tahoma, Arial, sans-serif; line-height: 1.55; }
        .qf-paper p { margin: .35em 0; }
        .qf-paper h2 { font-weight: bold; margin-top: .8em; }
        .qf-lines { width: 100%; border-collapse: collapse; margin: .85em 0; font-size: .88em; }
        .qf-lines th, .qf-lines td { border: 1px solid #222; padding: 4px; text-align: center; overflow-wrap: anywhere; }
        .qf-lines th { background: #eee; }
        .qf-contact { border-top: 1px solid #333; margin-top: 1.2em; padding-top: .4em; font-size: .8em; }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          .qf-paper { font-size: 10pt; }
          .qf-paper thead { display: table-header-group; }
          .qf-paper tr, .qf-contact { break-inside: avoid; }
          .qf-paper h2 { break-after: avoid; }
        }
      `}</style>

      <QuotationHeader />
      <div dir="ltr" className="my-2 flex flex-wrap justify-between gap-2 text-sm">
        <span>File NO: Quote No- <bdi>{quote.quote_no}</bdi></span>
        <span>Date: <bdi>{quote.quote_date}</bdi> G</span>
      </div>
      {!approved && <p className="text-center font-bold">مسودة</p>}

      <p>السادة / <strong>{quote.customer_name}</strong> المحترمين</p>
      <p>عناية المكرم / {quote.contact_person || "—"} المحترم</p>
      <p>إيميل: <bdi>{quote.email || "—"}</bdi>　 رقم جوال: <bdi>{quote.mobile || "—"}</bdi></p>
      <p>تحية طيبة وبعد ،،،،</p>
      <h2 className="text-center">الموضوع: {quote.subject}</h2>
      <p>
        بناءً على طلبكم يسرنا أن نقدم لسعادتكم عرض أسعارنا لأعمال التربة والخرسانة
        للمشروع {quote.project_name || "المذكور أعلاه"} بمدينة {quote.city || "—"}، منطقة {quote.region || "—"}.
        نأمل أن ينال عرضنا هذا قبولكم، وفي حال وجود أية استفسارات بهذا الموضوع نرجو من سعادتكم عدم التردد في الاتصال بنا.
      </p>

      <table className="qf-lines">
        <thead><tr>
          {["م","نوع الاختبار","الوحدة","الكمية","السعر الإفرادي","إجمالي السعر (ريال سعودي)","ملاحظات أو طريقة الاختبار","حالة اعتماد الاختبار من الساك"].map(label =>
            <th key={label} scope="col">{label}</th>
          )}
        </tr></thead>
        <tbody>
          {rows.map(item => (
            <tr key={item.line_no}>
              <td>{item.line_no}</td><td>{item.test_name}</td><td>{item.unit}</td>
              <td>{item.quantity}</td><td>{price.format(item.unit_price)}</td>
              <td>{price.format(item.line_total)}</td><td>{item.method_or_notes || "—"}</td>
              <td>{item.saac_scope_status || "لم تُحدّد"}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 4 - rows.length) }, (_, i) => (
            <tr key={"empty-" + i}>
              <td>{rows.length + i + 1}</td>
              {Array.from({ length: 7 }, (_, j) => <td key={j}>&nbsp;</td>)}
            </tr>
          ))}
          <tr><th colSpan={5}>الإجمالي (ريال سعودي)</th><td colSpan={3}>{price.format(total)}</td></tr>
        </tbody>
      </table>

      <h2>مسؤوليات العميل</h2>
      <p>توفير المخططات الهندسية للمباني والقرار المساحي إذا أمكن من طرفكم وتحديد مواقعها.</p>
      <p>توفير مساعد أو عامل أثناء الاختبار، مع إبلاغنا بموعد الاختبار قبل 24 ساعة.</p>
      <h2>بعض الشروط</h2>
      <p>مدة صلاحية هذا العرض خلال شهر من تاريخه.</p>
      <p>في حالة موافقتكم على هذا العرض يرجى التكرم بتزويدنا بأمر شراء من شركتكم الموقرة.</p>
      <p>تحتفظ شركة رمز الإمارات بحقها في الاحتفاظ بالتقارير أو إيقاف تقديم الخدمات إذا تأخر العميل في سداد الفواتير المستحقة خلال فترة السداد المتفق عليها في البند التالي.</p>
      <p>يجب تسديد 100% من الفاتورة في غضون 10 أيام كحد أقصى من تاريخ إصدار الفاتورة، ومبلغ تأمين عند البدء في تنفيذ الأعمال بنسبة 50% من قيمة الفاتورة.</p>
      <p>حساب المختبر البنكي (مصرف الراجحي) للتحويل المالي عليه:</p>
      <p dir="ltr" className="text-center">NO: 554608010658441　 IBAN: SA32 8000 0554 6080 1065 8441</p>
      <p>نأمل أن نوفّق بخدمتكم في جميع الأعمال المخبرية لمشاريعكم الجارية، وفي حالة وجود أي استفسار يرجى الاتصال بنا على الأرقام الموضحة أدناه.</p>
      <p>وتفضلوا بقبول فائق الاحترام ،،،،،</p>
      <div className="mt-3 text-center">
        <strong>شركة رمز الإمارات لفحص التربة والخرسانة</strong>
        <p>مدير المختبر م. لينا نوح</p>
        {approved && quote.approved_at && (
          <p>تم الاعتماد بتاريخ {new Date(quote.approved_at).toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh" })}</p>
        )}
      </div>
      {hasApprovalImages && (
        <div className="qf-approval-images" dir="rtl">
          <figure>
            <img src={signature!} alt="توقيع مديرة المختبر" loading="eager" />
            <figcaption>توقيع مديرة المختبر</figcaption>
          </figure>
          <figure>
            <img src={seal!} alt="ختم الشركة" loading="eager" />
            <figcaption>ختم الشركة</figcaption>
          </figure>
        </div>
      )}
      <footer className="qf-contact" dir="rtl">
        <style>{`
          .qf-paper .qf-contact {
            margin-top: 6mm;
            padding-top: 2mm;
            border-top: 1px solid #222;
            color: #111;
            font-size: 9pt;
            line-height: 1.65;
            break-inside: avoid;
          }
          .qf-footer-branches {
            display: grid;
            grid-template-columns: 1.05fr 1fr 1.15fr;
            gap: 1mm 3mm;
            text-align: right;
            align-items: baseline;
          }
          .qf-footer-address { grid-column: span 2; }
          .qf-footer-branches bdi { white-space: nowrap; }
          .qf-footer-branches a { color: inherit; text-decoration: none; }
          @media screen and (max-width: 640px) {
            .qf-footer-branches { grid-template-columns: 1fr; }
            .qf-footer-address { grid-column: auto; }
          }
        `}</style>
        <div className="qf-footer-branches">
          <div className="qf-footer-address">
            * المقر الرئيسي: مدينة القريات – مقابل البلدية القديمة – حي السديرية
          </div>
          <div>* الإدارة، ت: <bdi dir="ltr">0509982399 – 0509173884</bdi></div>

          <div>* الخبر والدمام، ت: <bdi dir="ltr">0554187910</bdi></div>
          <div>* مكة وجدة، ت: <bdi dir="ltr">0576120827</bdi></div>
          <div>* للتواصل: <a href="mailto:info@ramzalemarat.com"><bdi dir="ltr">info@ramzalemarat.com</bdi></a></div>

          <div>* سكاكا ودومة الجندل، ت: <bdi dir="ltr">0532720004</bdi></div>
          <div>* طريف وعرعر، ت: <bdi dir="ltr">0554596469</bdi></div>
          <div>* الموقع الإلكتروني: <a href="http://www.ramzalemarat.com"><bdi dir="ltr">www.ramzalemarat.com</bdi></a></div>
        </div>
      </footer>
          <style>{`
        /* QF70103 repeating print footer */
        @page {
          size: A4 portrait;
          margin: 12mm 12mm 30mm;
        }
        @media print {
          .qf-paper .qf-contact {
            position: fixed;
            left: 0;
            right: 0;
            bottom: -23mm;
            box-sizing: border-box;
            margin: 0;
            padding: 2mm 0 0;
            border-top: 1px solid #222;
            background: white;
            color: black;
            font-size: 8.5pt;
            line-height: 1.45;
          }
          .qf-paper .qf-footer-branches {
            display: grid;
            grid-template-columns: 1.05fr 1fr 1.15fr;
            gap: 1mm 3mm;
          }
          .qf-paper .qf-footer-address {
            grid-column: span 2;
          }
        }
      `}</style>
          <style>{String.raw`
        /* quotation-margin-footer-v2 */
        @media print {
          .qf-paper footer.qf-contact {
            display: none !important;
          }
        }
        @page {
          size: A4 portrait;
          margin: 12mm 12mm 30mm;
          @bottom-center {
            content: "المقر الرئيسي: مدينة القريات – مقابل البلدية القديمة – حي السديرية　 |　 الإدارة: \200E 0509982399 – 0509173884\200E\A الخبر والدمام: \200E 0554187910\200E　 |　 مكة وجدة: \200E 0576120827\200E　 |　 للتواصل: info@ramzalemarat.com\A سكاكا ودومة الجندل: \200E 0532720004\200E　 |　 طريف وعرعر: \200E 0554596469\200E　 |　 الموقع الإلكتروني: www.ramzalemarat.com";
            width: 100%;
            direction: rtl;
            text-align: right;
            vertical-align: top;
            white-space: pre-line;
            border-top: 1px solid black;
            padding-top: 2mm;
            color: black;
            font: 9pt/1.5 Tahoma, Arial, sans-serif;
          }
        }
      `}</style>
          {hasApprovalImages && (
        <style>{`
          .qf-approval-images {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 18mm;
            margin: 4mm 0;
            break-inside: avoid;
          }
          .qf-approval-images figure { margin: 0; text-align: center; }
          .qf-approval-images img {
            display: block;
            width: 32mm;
            height: 16mm;
            object-fit: contain;
            margin: 0 auto;
          }
          .qf-approval-images figcaption { font: 9pt/1.2 Tahoma, Arial, sans-serif; }
          @page {
            margin-bottom: 46mm;
            @bottom-center { padding-top: 23mm; }
          }
          @media print {
            .qf-approval-images {
              position: fixed;
              left: 0;
              right: 0;
              bottom: -21mm;
              height: 19mm;
              margin: 0;
              z-index: 2;
            }
            .qf-approval-images img { height: 14mm; }
          }
        `}</style>
      )}
    </article>
  );
}