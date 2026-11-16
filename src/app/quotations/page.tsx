"use client";

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
      setError(cause instanceof Error ? cause.message : "تعذر حذف المسودة.");
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
        const canOpen = role === "accountant" ||
          role === "technical_manager" ||
          (role === "admin" && Number(user?.id) === 1);

        if (!canOpen) {
          setError("ليس لديك صلاحية لفتح عروض الأسعار.");
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
        if (active) setError("تعذر تحميل عروض الأسعار. أعيدي المحاولة.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [attempt]);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-blue-900">عروض الأسعار</h1>
          {!loading && !error && (
            <Link href="/quotations/new" className="rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800">
              إنشاء عرض سعر
            </Link>
          )}
          <Link href="/dashboard" className="rounded-lg border bg-white px-4 py-2">
            لوحة التحكم
          </Link>
        </header>

        <section className="overflow-x-auto rounded-xl bg-white p-5 shadow">
          {loading ? (
            <p role="status">جارٍ تحميل عروض الأسعار…</p>
          ) : error ? (
            <div>
              <p role="alert" className="text-red-700">{error}</p>
              <button
                type="button"
                className="mt-3 rounded-lg border px-4 py-2"
                onClick={() => setAttempt(value => value + 1)}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : quotes.length === 0 ? (
            <p className="py-6 text-center text-slate-600">
              لا توجد عروض أسعار حتى الآن.
            </p>
          ) : (
            <table className="w-full text-right">
              <thead className="border-b text-slate-600">
                <tr>
                  {["رقم العرض", "التاريخ", "العميل", "الموضوع", "الحالة", "الإجراءات"].map(label => (
                    <th key={label} scope="col" className="p-3">{label}</th>
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
                      {quote.status === "Approved" ? "معتمد" :
                        quote.status === "Draft" ? "مسودة" : quote.status}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3 text-blue-800">
                        <Link href={"/quotations/" + quote.id}>عرض</Link>
                        <Link href={"/quotations/" + quote.id + "?action=print"}>طباعة</Link>
                        {quote.status === "Draft" && (
                          <Link href={"/quotations/" + quote.id + "?action=edit"}>تعديل</Link>
                        )}
                        {quote.status === "Draft" && canDelete && (
                          <button type="button" disabled={deleting !== null}
                            className="text-red-700" onClick={() => deleteDraft(quote)}>
                            حذف
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
    <ProtectedRoute allowedRoles={["admin", "accountant", "technical_manager"]}>
      <QuotationList />
    </ProtectedRoute>
  );
}