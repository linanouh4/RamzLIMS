"use client";

import BackButton from "@/components/BackButton";
import { useUiText } from "@/lib/uiText";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getSavedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Quote = {
  id: number;
  draft_version: number;
  quote_no: string;
  quote_date: string;
  customer_name: string;
  subject: string;
  status: string;
};

function QuotationList() {
  const ui = useUiText();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const actor = getSavedUser();
  const canDelete = Number(actor?.id) === 1 && actor?.role.trim().toLowerCase() === "admin";
  const [deleting, setDeleting] = useState<number | null>(null);

  async function deleteDraft(quote: Quote) {
    if (!canDelete || quote.status !== "Draft" || deleting !== null) return;
    const confirmed = window.confirm(
      "حذف المسودة نهائيًا؟\nرقم العرض: " + quote.quote_no + "\nالعميل: " + quote.customer_name
    );
    if (!confirmed) return;

    setDeleting(quote.id);
    try {
      const { error } = await supabase.rpc("delete_quotation_draft", {
        p_quotation_id: quote.id,
        p_expected_version: quote.draft_version,
      });
      if (error) throw new Error(error.message);
      setQuotes(current => current.filter(row => row.id !== quote.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ui("تعذر حذف المسودة."));
    } finally {
      setDeleting(null);
    }
  }

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const user = getSavedUser();
        const role = user?.role?.trim().toLowerCase();
        const canOpen = role === "quality_manager" || role === "branch_manager" || role === "accountant" ||
          role === "technical_manager" ||
          (role === "admin" && Number(user?.id) === 1);

        if (!canOpen) {
          setError(ui("ليس لديك صلاحية لفتح عروض الأسعار."));
          return;
        }

        const { data, error: queryError } = await supabase
          .from("quotations")
          .select("id, draft_version, quote_no, quote_date, customer_name, subject, status")
          .order("quote_date", { ascending: false })
          .order("id", { ascending: false });

        if (queryError) throw queryError;
        if (active) setQuotes(data ?? []);
      } catch {
        if (active) setError(ui("تعذر تحميل عروض الأسعار. أعيدي المحاولة."));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [attempt]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-blue-900">{ui("عروض الأسعار")}</h1>
          {!loading && !error && actor?.role !== "quality_manager" && (
            <Link href="/quotations/new" className="rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800">
              {ui("إنشاء عرض سعر")}
            </Link>
          )}
          <BackButton href="/dashboard" />
        </header>

        <section className="overflow-x-auto rounded-xl bg-white p-5 shadow">
          {loading ? (
            <p role="status">{ui("جارٍ تحميل عروض الأسعار…")}</p>
          ) : error ? (
            <div>
              <p role="alert" className="text-red-700">{ui(error)}</p>
              <button
                type="button"
                className="mt-3 rounded-lg border px-4 py-2"
                onClick={() => setAttempt(value => value + 1)}
              >
                {ui("إعادة المحاولة")}
              </button>
            </div>
          ) : quotes.length === 0 ? (
            <p className="py-6 text-center text-slate-600">
              {ui("لا توجد عروض أسعار حتى الآن.")}
            </p>
          ) : (
            <table className="w-full text-end">
              <thead className="border-b text-slate-600">
                <tr>
                  {["رقم العرض", "التاريخ", "العميل", "الموضوع", "الحالة", "الإجراءات"].map(label => (
                    <th key={label} scope="col" className="p-3">{ui(label)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotes.map(quote => (
                  <tr key={quote.id} className="border-b last:border-0">
                    <td className="p-3"><bdi>{quote.quote_no}</bdi></td>
                    <td className="whitespace-nowrap p-3"><bdi>{quote.quote_date}</bdi></td>
                    <td className="p-3">{quote.customer_name}</td>
                    <td className="p-3">{quote.subject}</td>
                    <td className="p-3">
                      {quote.status === "Approved" ? ui("معتمد") :
                        quote.status === "Draft" ? ui("مسودة") : quote.status}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3 text-blue-800">
                        <Link href={"/quotations/" + quote.id}>{ui("عرض")}</Link>
                        <Link href={"/quotations/" + quote.id + "?action=print"}>{ui("طباعة")}</Link>
                        {quote.status === "Draft" && actor?.role !== "quality_manager" && (
                          <Link href={"/quotations/" + quote.id + "?action=edit"}>{ui("تعديل")}</Link>
                        )}
                        {quote.status === "Draft" && canDelete && (
                          <button type="button" disabled={deleting !== null}
                            className="text-red-700" onClick={() => deleteDraft(quote)}>
                            {ui("حذف")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}

export default function QuotationsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "accountant", "branch_manager", "technical_manager", "quality_manager"]}>
      <QuotationList />
    </ProtectedRoute>
  );
}