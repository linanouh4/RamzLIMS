"use client";
import { useUiText } from "@/lib/uiText";
import { QuotationHeader } from "./QuotationPaper";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { getSavedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const headerFields = [
  { name: "quote_no", label: "رقم عرض السعر", required: true },
  { name: "quote_date", label: "تاريخ العرض", type: "date", required: true },
  { name: "customer_name", label: "اسم العميل", required: true },
  { name: "contact_person", label: "مسؤول الاتصال" },
  { name: "mobile", label: "رقم الجوال", type: "tel" },
  { name: "email", label: "البريد الإلكتروني", type: "email" },
  { name: "subject", label: "موضوع العرض", required: true },
  { name: "project_name", label: "اسم المشروع" },
  { name: "city", label: "المدينة" },
  { name: "region", label: "المنطقة" },
];

function newLine(key: number) {
  return {
    key, test_name: "", unit: "", quantity: "1", unit_price: "",
    method_or_notes: "", saac_scope_status: "",
  };
}

type Line = ReturnType<typeof newLine>;
type LineField = Exclude<keyof Line, "key">;

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2";
const money = new Intl.NumberFormat("ar-SA", {
  style: "currency", currency: "SAR",
});

function lineAmount(line: Line) {
  return Math.round(Number(line.quantity) * Number(line.unit_price) * 100) / 100;
}

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export type SavedLine = {
  line_no: number;
  test_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  method_or_notes: string | null;
  saac_scope_status: string | null;
};

export type SavedQuote = {
  id: number;
  draft_version: number;
  status: string;
  quote_no: string;
  quote_date: string;
  customer_name: string;
  contact_person: string | null;
  mobile: string | null;
  email: string | null;
  subject: string;
  project_name: string | null;
  city: string | null;
  region: string | null;
  client_id: number | null;
  project_id: number | null;
  approved_by: number | null;
  approved_at: string | null;
  approval_signature: string | null;
  approval_company_stamp: string | null;
  quotation_items: SavedLine[];
};

export default function DraftForm({ quote }: { quote?: SavedQuote }) {
  const ui = useUiText();
  const router = useRouter();
  const user = getSavedUser();
  const role = user?.role?.trim().toLowerCase();
  const canCreate = role === "accountant" || role === "technical_manager" ||
    (role === "admin" && Number(user?.id) === 1);

  const [lines, setLines] = useState<Line[]>(() => quote
    ? quote.quotation_items.map((item, index) => ({
        key: index + 1,
        test_name: item.test_name,
        unit: item.unit,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
        method_or_notes: item.method_or_notes ?? "",
        saac_scope_status: item.saac_scope_status ?? "",
      }))
    : [newLine(1)]);
  const nextKey = useRef(lines.length + 1);
  const savingNow = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function changeLine(key: number, field: LineField, value: string) {
    setLines(current => current.map(line =>
      line.key === key ? { ...line, [field]: value } : line
    ));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate || savingNow.current) return;

    const form = new FormData(event.currentTarget);
    const header = Object.fromEntries(headerFields.map(field =>
      [field.name, String(form.get(field.name) ?? "").trim()]
    ));
    const items = lines.map(line => ({
      test_name: line.test_name.trim(),
      unit: line.unit.trim(),
      quantity: Number(line.quantity),
      unit_price: Number(line.unit_price),
      method_or_notes: line.method_or_notes.trim() || null,
      saac_scope_status: line.saac_scope_status || null,
    }));

    savingNow.current = true;
    setSaving(true);
    setError("");
    try {
      const { data, error: saveError } = await supabase.rpc(quote ? "update_quotation_draft" : "create_quotation_draft", {
        p_header: { ...header, client_id: quote?.client_id ?? null, project_id: quote?.project_id ?? null },
        p_items: items,
        ...(quote ? { p_quotation_id: quote.id, p_expected_version: quote.draft_version } : {}),
      });
      if (saveError) throw new Error(saveError.message);
      if (data == null) throw new Error(ui("تعذر تأكيد رقم المسودة. تحققي من قائمة عروض الأسعار."));
      router.replace("/quotations");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ui("تعذر حفظ المسودة."));
      savingNow.current = false;
      setSaving(false);
    }
  }

  if (!canCreate) {
    return <p role="alert" className="p-8">{ui("ليس لديك صلاحية إنشاء عرض سعر.")}</p>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">{quote ? ui("تعديل عرض السعر") : ui("إنشاء عرض سعر")}</h1>
            <p className="mt-1 text-sm text-slate-600">QF 701/03</p>
          </div>
          <Link href="/quotations" className="rounded-lg border bg-white px-4 py-2">
            {ui("عروض الأسعار")}
          </Link>
        </header>

        <div className="mb-4 bg-white"><QuotationHeader /></div>
        <form onSubmit={save}>
          <fieldset disabled={saving} className="space-y-5">
            <section className="rounded-xl bg-white p-5 shadow">
              <h2 className="mb-4 text-lg font-bold">{ui("بيانات العرض والعميل")}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {headerFields.map(field => (
                  <label key={field.name}>
                    {ui(field.label)}{field.required ? " *" : ""}
                    <input
                      name={field.name}
                      type={field.type || "text"}
                      required={field.required}
                      defaultValue={quote ? String(quote[field.name as keyof SavedQuote] ?? "") : field.name === "quote_date" ? today() : undefined}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-white p-5 shadow">
              <h2 className="mb-4 text-lg font-bold">{ui("بنود عرض السعر")}</h2>
              {lines.map((line, index) => (
                <fieldset key={line.key} className="mb-5 rounded-lg border p-4">
                  <legend className="px-2 font-semibold">{ui("البند")} {index + 1}</legend>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label>{ui("اسم الفحص *")}
                      <input required className={inputClass} value={line.test_name}
                        onChange={e => changeLine(line.key, "test_name", e.target.value)} />
                    </label>
                    <label>{ui("الوحدة *")}
                      <input required className={inputClass} value={line.unit}
                        onChange={e => changeLine(line.key, "unit", e.target.value)} />
                    </label>
                    <label>{ui("الكمية *")}
                      <input required type="number" min="0" step="any" className={inputClass}
                        value={line.quantity}
                        onChange={e => changeLine(line.key, "quantity", e.target.value)} />
                    </label>
                    <label>{ui("سعر الوحدة بالريال *")}
                      <input required type="number" min="0" step="0.01" className={inputClass}
                        value={line.unit_price}
                        onChange={e => changeLine(line.key, "unit_price", e.target.value)} />
                    </label>
                    <label>{ui("طريقة الفحص أو الملاحظات")}
                      <input className={inputClass} value={line.method_or_notes}
                        onChange={e => changeLine(line.key, "method_or_notes", e.target.value)} />
                    </label>
                    <label>{ui("حالة الفحص ضمن نطاق اعتماد ساك")}
                      <select className={inputClass} value={line.saac_scope_status}
                        onChange={e => changeLine(line.key, "saac_scope_status", e.target.value)}>
                        <option value="">{ui("لم تُحدّد بعد")}</option>
                        <option value="ضمن نطاق الاعتماد">{ui("ضمن نطاق الاعتماد")}</option>
                        <option value="خارج نطاق الاعتماد">{ui("خارج نطاق الاعتماد")}</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span>{ui("إجمالي البند")} {money.format(lineAmount(line))}</span>
                    <button type="button" className="text-sm text-red-700"
                      onClick={() => setLines(current => current.filter(row => row.key !== line.key))}>
                      {ui("إزالة البند")}
                    </button>
                  </div>
                </fieldset>
              ))}
              <button type="button" className="rounded-lg border px-4 py-2"
                onClick={() => {
                  const row = newLine(nextKey.current++);
                  setLines(current => [...current, row]);
                }}>
                {ui("إضافة بند")}
              </button>
              <p className="mt-5 text-lg font-bold">
                {ui("إجمالي العرض")} {money.format(lines.reduce((sum, line) => sum + lineAmount(line), 0))}
              </p>
            </section>

            {error && <p dir="auto" role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{ui(error)}</p>}
            <button type="submit" disabled={saving}
              className="rounded-lg bg-blue-700 px-6 py-3 text-white disabled:opacity-60">
              {saving ? ui("جارٍ الحفظ…") : quote ? ui("حفظ التعديلات") : ui("حفظ كمسودة")}
            </button>
          </fieldset>
        </form>
      </div>
    </main>
  );
}

