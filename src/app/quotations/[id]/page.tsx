"use client";
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
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>(".qf-paper img")
  );
  try {
    await Promise.all(images.map(image => image.decode()));
  } catch {
    window.alert("تعذر تحميل إحدى صور عرض السعر. حدّثي الصفحة وأعيدي الطباعة.");
    return;
  }
  window.print();
}

function Details() {
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
      setError("اختاري صورة ختم PNG أو JPG أو WebP بحجم أقصاه 5 MB.");
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
      if (run === stampRun.current) setError("تعذرت قراءة صورة الختم. اختاري صورة أخرى.");
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
        setError(error?.message || "العرض غير موجود أو غير متاح لهذا الحساب.");
        return;
      }
      const saved = data as SavedQuote;
      saved.quotation_items.sort((a, b) => a.line_no - b.line_no);
      setQuote(saved);
    }

    void load().catch(() => {
      if (active) setError("تعذر تحميل العرض. أعيدي فتح الصفحة.");
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
      setError("اختاري ختم الشركة وانتظري ظهور معاينته قبل الاعتماد.");
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
      setError(cause instanceof Error ? cause.message : "تعذر اعتماد العرض.");
    } finally {
      setBusy(false);
    }
  }

  if (!quote || String(quote.id) !== id) {
    return <main dir="rtl" className="p-6">{error || "جارٍ تحميل عرض السعر…"}</main>;
  }

  const draft = quote.status === "Draft";
  if (action === "edit" && draft) return <DraftForm key={id} quote={quote} />;
  const total = quote.quotation_items.reduce(
    (sum, item) => sum + Math.round(Number(item.line_total) * 100), 0
  ) / 100;

  return (
    <main dir="rtl" className="mx-auto max-w-5xl p-5 text-slate-900">
      <style>{'@media print { @page { size:A4; margin:14mm } thead {display:table-header-group} tr {break-inside:avoid} }'}</style>
      <nav className="mb-5 flex flex-wrap gap-5 text-blue-800 print:hidden">
        <Link href="/quotations">قائمة العروض</Link>
        <button type="button" onClick={() => void printQuotation()}>طباعة</button>
        {draft && <Link href={"/quotations/" + id + "?action=edit"}>تعديل</Link>}
        
      </nav>

      {draft && canApprove && (
        <section dir="rtl" className="mb-5 rounded-xl border bg-white p-4 print:hidden">
          <label className="block font-semibold" htmlFor="quotation-company-stamp">
            ختم الشركة لاعتماد عرض السعر
          </label>
          <input id="quotation-company-stamp" type="file"
            accept="image/png,image/jpeg,image/webp" disabled={busy}
            className="mt-2 block"
            onChange={event => { void chooseStamp(event.currentTarget.files?.[0]); }} />
          {readingStamp && <p role="status">جارٍ قراءة الختم…</p>}
          {stamp.quoteId === id && stamp.data && (
            <img src={stamp.data} alt="معاينة ختم الشركة المختار"
              className="mt-3 h-20 max-w-48 object-contain" />
          )}
                  <button
            type="button"
            disabled={busy || readingStamp || stamp.quoteId !== id || !stamp.data}
            onClick={() => approve(quote)}
            className="mt-4 block rounded-lg bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
          >
            {busy ? "جارٍ الاعتماد…" :
             readingStamp ? "جارٍ تجهيز الختم…" :
             stamp.quoteId === id && stamp.data ? "اعتماد العرض" : "اختاري الختم أولًا"}
          </button>
        </section>
      )}

      {error && <p role="alert" className="mb-3 text-red-700 print:hidden">{error}</p>}

      <QuotationPaper quote={quote} total={total} />
    </main>
  );
}

export default function QuotationDetailsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "accountant", "technical_manager"]}>
      <Details />
    </ProtectedRoute>
  );
}