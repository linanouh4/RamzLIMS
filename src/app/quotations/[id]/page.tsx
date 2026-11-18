"use client";
import BackButton from "@/components/BackButton";
import { useUiText } from "@/lib/uiText";
import QuotationPaper from "../QuotationPaper";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getSavedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import DraftForm, { type SavedQuote } from "../QuotationForm";

const amount = new Intl.NumberFormat("ar-SA", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

async function printQuotation() {
  const paper = document.querySelector<HTMLElement>(".qf-paper");
  if (!paper) return;

  const approval = paper.querySelector(".qf-approval-images");
  const signature = approval?.querySelector<HTMLImageElement>("figure:first-child img");
  const stamp = approval?.querySelector<HTMLImageElement>("figure:last-child img");
  const contacts = paper.querySelector<HTMLElement>(".qf-footer-branches");
  const printStyle = document.createElement("style");

  try {
    await Promise.all(Array.from(paper.querySelectorAll("img"), img => img.decode()));
    await document.fonts.ready;

    if (!contacts || (approval && (!stamp || !signature))) {
      throw new Error("تعذر تجهيز بيانات التذييل.");
    }

    
    const width = 700;
    const height = 57;
    const canvas = document.createElement("canvas");
    canvas.width = width * 3;
    canvas.height = height * 3;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الطباعة.");
    ctx.scale(3, 3);

    const lineY = 1;
    ctx.fillStyle = "#222";
    ctx.fillRect(0, lineY, width, 1);
    ctx.font = "10px Tahoma, Arial, sans-serif";
    ctx.direction = "rtl";
    ctx.textAlign = "right";

    const fields = Array.from(contacts.children, el => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("bdi").forEach(part => {
        part.textContent = "\u2066" + part.textContent + "\u2069";
      });
      return (copy.textContent || "").replace(/\s+/g, " ").trim();
    });

    // نفس ترتيب بيانات الفروع في النموذج: سطر العنوان ثم سطران للفروع.
    const positions = [
      [698, 14, 455], [228, 14, 226],
      [698, 30, 228], [463, 30, 228], [228, 30, 226],
      [698, 46, 228], [463, 46, 228], [228, 46, 226],
    ];
    if (fields.length !== positions.length) {
      throw new Error("تعذر ترتيب بيانات الفروع.");
    }
    fields.forEach((field, index) => {
      const [x, y, maxWidth] = positions[index];
      ctx.fillText(field, x, lineY + y, maxWidth);
    });

    const png = canvas.toDataURL("image/png");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="${png}"/></svg>`;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const readyImage = new Image();
    readyImage.src = url;
    await readyImage.decode();

    printStyle.textContent = `
      @media print {
        .qf-paper { page: ramzQuotation; }
        .qf-paper .qf-page-end { display: none !important; }
      }
      @page ramzQuotation {
        size: A4 portrait;
        margin: 10mm 12mm 20mm;
        @bottom-center {
          content: url("${url}");
          vertical-align: middle;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(printStyle);
    window.addEventListener("afterprint", () => printStyle.remove(), { once: true });
    window.print();
  } catch (error: unknown) {
    printStyle.remove();
    const reason = error instanceof Error
      ? error.name + " — " + error.message
      : String(error);
    window.alert("سبب تعذّر الطباعة:\n" + reason);
  }
}

function Details() {
  const ui = useUiText();
  const { id } = useParams<{ id: string }>();
  const action = useSearchParams().get("action");
  const [quote, setQuote] = useState<SavedQuote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const printed = useRef("");
  const stampRun = useRef(0);
  const [stamp, setStamp] = useState({ quoteId: "", data: "" });
  const [readingStamp, setReadingStamp] = useState(false);

  async function chooseStamp(file?: File) {
    const run = ++stampRun.current;
    setStamp({ quoteId: "", data: "" });
    setError("");
    setReadingStamp(false);
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError(ui("اختاري صورة ختم PNG أو JPG أو WebP بحجم أقصاه 5 MB."));
      return;
    }

    setReadingStamp(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string"
          ? resolve(reader.result) : reject(new Error());
        reader.onerror = () => reject(new Error());
        reader.onabort = () => reject(new Error());
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = data;
      await image.decode();
      if (run === stampRun.current) setStamp({ quoteId: id, data });
    } catch {
      if (run === stampRun.current) setError(ui("تعذرت قراءة صورة الختم. اختاري صورة أخرى."));
    } finally {
      if (run === stampRun.current) setReadingStamp(false);
    }
  }
  const actor = getSavedUser();
  const canApprove = Number(actor?.id) === 1 && actor?.role.trim().toLowerCase() === "admin";

  useEffect(() => {
    let active = true;
    setQuote(null);
    setError("");

    async function load() {
      const { data, error } = await supabase.from("quotations")
        .select("*, quotation_items(*)").eq("id", id).maybeSingle();
      if (!active) return;
      if (error || !data) {
        setError(error?.message || ui("العرض غير موجود أو غير متاح لهذا الحساب."));
        return;
      }
      const saved = data as SavedQuote;
      saved.quotation_items.sort((a, b) => a.line_no - b.line_no);
      setQuote(saved);
    }

    void load().catch(() => {
      if (active) setError(ui("تعذر تحميل العرض. أعيدي فتح الصفحة."));
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (action !== "print") { printed.current = ""; return; }
    if (!quote || String(quote.id) !== id || printed.current === id) return;
    const timer = setTimeout(() => {
      printed.current = id;
      void printQuotation();
    }, 100);
    return () => clearTimeout(timer);
  }, [action, id, quote]);

  async function approve(q: SavedQuote) {
    if (!canApprove || busy || q.status !== "Draft") return;
    if (readingStamp || stamp.quoteId !== id || !stamp.data) {
      setError(ui("اختاري ختم الشركة وانتظري ظهور معاينته قبل الاعتماد."));
      return;
    }
    if (!window.confirm("اعتماد العرض " + q.quote_no + " للعميل " + q.customer_name + " نهائيًا؟")) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.rpc("approve_quotation", {
        p_quotation_id: q.id, p_expected_version: q.draft_version, p_company_stamp: stamp.data,
      });
      if (error) throw new Error(error.message);
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ui("تعذر اعتماد العرض."));
    } finally {
      setBusy(false);
    }
  }

  if (!quote || String(quote.id) !== id) {
    return <main className="p-6">{error || ui("جارٍ تحميل عرض السعر…")}</main>;
  }

  const draft = quote.status === "Draft";
  if (action === "edit" && draft) return <DraftForm key={id} quote={quote} />;
  const total = quote.quotation_items.reduce(
    (sum, item) => sum + Math.round(Number(item.line_total) * 100), 0
  ) / 100;

  return (
    <main className="mx-auto max-w-5xl p-5 text-slate-900">
      <style>{'@media print { @page { size:A4; margin:14mm } thead {display:table-header-group} tr {break-inside:avoid} }'}</style>
      <nav className="mb-5 flex flex-wrap gap-5 text-blue-800 print:hidden">
        <BackButton href="/quotations" />
        <button type="button" onClick={() => void printQuotation()}>{ui("طباعة")}</button>
        {draft && <Link href={"/quotations/" + id + "?action=edit"}>{ui("تعديل")}</Link>}
        
      </nav>

      {draft && canApprove && (
        <section className="mb-5 rounded-xl border bg-white p-4 print:hidden">
          <label className="block font-semibold" htmlFor="quotation-company-stamp">
            {ui("ختم الشركة لاعتماد عرض السعر")}
          </label>
          <input id="quotation-company-stamp" type="file"
            accept="image/png,image/jpeg,image/webp" disabled={busy}
            className="mt-2 block"
            onChange={event => { void chooseStamp(event.currentTarget.files?.[0]); }} />
          {readingStamp && <p role="status">{ui("جارٍ قراءة الختم…")}</p>}
          {stamp.quoteId === id && stamp.data && (
            <img src={stamp.data} alt={ui("معاينة ختم الشركة المختار")}
              className="mt-3 h-20 max-w-48 object-contain" />
          )}
                  <button
            type="button"
            disabled={busy || readingStamp || stamp.quoteId !== id || !stamp.data}
            onClick={() => approve(quote)}
            className="mt-4 block rounded-lg bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
          >
            {busy ? ui("جارٍ الاعتماد…") :
             readingStamp ? ui("جارٍ تجهيز الختم…") :
             stamp.quoteId === id && stamp.data ? ui("اعتماد العرض") : ui("اختاري الختم أولًا")}
          </button>
        </section>
      )}

      {error && <p role="alert" className="mb-3 text-red-700 print:hidden">{ui(error)}</p>}

      <QuotationPaper quote={quote} total={total} />
    </main>
  );
}

export default function QuotationDetailsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "accountant", "branch_manager", "technical_manager", "quality_manager"]}>
      <Details />
    </ProtectedRoute>
  );
}