"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type VerificationData = {
  verification_code: string;
  status: string;
  contract_number: string;
  contract_name: string;
  finalized_at: string | null;
};

export default function VerifyContractPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verifyContract() {
      try {
        const { code } = await params;
        const cleanCode = (code || "").trim().toUpperCase();

        if (!cleanCode) {
          throw new Error("رمز التحقق غير موجود.");
        }

        const { data: result, error: rpcError } = await supabase.rpc(
          "get_public_contract_verification",
          { p_code: cleanCode }
        );

        if (rpcError) {
          console.error("Contract verification failed:", rpcError);
          throw new Error("تعذر إكمال التحقق حاليًا.");
        }

        if (!result || result.length === 0) {
          throw new Error(
            "لم يتم العثور على سجل عقد نهائي مطابق لهذا الرمز. تحقق من صحة الرمز."
          );
        }

        const verification = result[0];

        if (
          verification.status !== "Finalized" ||
          !verification.finalized_at
        ) {
          throw new Error("لم يتم التأكد من الاعتماد النهائي لهذا العقد.");
        }

        if (!cancelled) {
          setData({
            verification_code: verification.verification_code,
            status: verification.status,
            contract_number: verification.contract_number || "-",
            contract_name: verification.contract_name || "-",
            finalized_at: verification.finalized_at,
          });
        }
      } catch (err) {
        console.error("Verification page error:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "حدث خطأ أثناء التحقق من الوثيقة."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    verifyContract();

    return () => {
      cancelled = true;
    };
  }, [params]);

  function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gray-100 p-6"
      >
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
          <h1 className="text-xl font-bold text-gray-900">
            جارٍ التحقق من الوثيقة
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            يرجى الانتظار حتى تكتمل عملية التحقق.
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gray-100 p-6"
      >
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-700">
            ✕
          </div>

          <h1 className="text-2xl font-bold text-red-700">
            تعذر التحقق من الوثيقة
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-600">
            {error || "لم يتم العثور على بيانات للتحقق."}
          </p>

          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-xs leading-6 text-gray-500">
            إذا وصلت إلى هذه الصفحة من خلال رمز QR الموجود على العقد،
            فتحقق من أن الرمز والرابط لم يتم تعديلهما.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-100 px-4 py-10"
    >
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
          <header className="bg-green-800 px-6 py-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-green-800 shadow">
              ✓
            </div>

            <h1 className="text-2xl font-bold">
              تم التحقق من سجل العقد
            </h1>

            <p className="mt-3 text-sm leading-7 text-green-100">
              عُثر على سجل عقد معتمد ونهائي يطابق رمز التحقق الإلكتروني.
            </p>
          </header>

          <section className="border-b border-gray-200 px-6 py-6 text-center">
            <p className="text-xs font-medium text-gray-500">
              رمز التحقق الإلكتروني
            </p>

            <div
              dir="ltr"
              className="mt-2 break-all rounded-xl bg-gray-50 px-4 py-3 font-mono text-lg font-bold tracking-wider text-gray-900"
            >
              {data.verification_code}
            </div>
          </section>

          <section className="px-6 py-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              معلومات العقد
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">رقم العقد</div>
                <div className="mt-2 break-words font-bold text-gray-900">
                  {data.contract_number}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">اسم العقد</div>
                <div className="mt-2 break-words font-bold text-gray-900">
                  {data.contract_name}
                </div>
              </div>

              <div className="rounded-xl bg-green-50 p-4 sm:col-span-2">
                <div className="text-xs text-green-700">
                  حالة سجل العقد
                </div>
                <div className="mt-2 font-bold text-green-800">
                  معتمد ونهائي
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 sm:col-span-2">
                <div className="text-xs text-gray-500">
                  تاريخ الاعتماد النهائي
                </div>
                <div className="mt-2 font-bold text-gray-900">
                  {formatDate(data.finalized_at)}
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-amber-200 bg-amber-50 px-6 py-5">
            <h2 className="font-bold text-amber-900">
              تنبيه بشأن أصالة الملف
            </h2>

            <p className="mt-2 text-sm leading-7 text-amber-900">
              يؤكد هذا الفحص وجود سجل عقد نهائي مطابق لرمز التحقق.
                         
             
            </p>
          </section>

          <footer className="border-t border-gray-200 px-6 py-6 text-center">
            <div className="text-sm font-bold text-gray-900">
              شركة رمز الإمارات لفحص التربة والخرسانة
            </div>

            <p className="mt-2 text-xs leading-6 text-gray-500">
              نظام التحقق الإلكتروني من الوثائق
            </p>
          </footer>
        </div>

        <p className="mt-5 text-center text-xs leading-6 text-gray-500">
          صفحة عامة للتحقق من سجل العقد. لا تعرض بيانات العميل أو تفاصيل
          توقيعاته.
        </p>
      </div>
    </main>
  );
}
