"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type VerificationData = {
  verification_code: string;
  status: string;
  contract_number: string;
  contract_name: string;
  client_name: string;
  customer_signed_by: string | null;
  customer_signed_at: string | null;
  approved_at: string | null;
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
    async function verifyContract() {
      try {
        const { code } = await params;

        if (!code) {
          setError("رمز التحقق غير موجود.");
          return;
        }

        const cleanCode = decodeURIComponent(code).trim().toUpperCase();

        const { data: result, error: rpcError } = await supabase.rpc(
          "get_public_contract_verification",
          {
            p_code: cleanCode,
          }
        );

        if (rpcError) {
          console.error(rpcError);
          throw rpcError;
        }

        if (!result || result.length === 0) {
          setError(
            "لم يتم العثور على وثيقة معتمدة بهذا الرمز. تأكد من صحة رمز التحقق."
          );
          return;
        }

        const verification = result[0];

        setData({
          verification_code: verification.verification_code,
          status: verification.status,
          contract_number: verification.contract_number || "-",
          contract_name: verification.contract_name || "-",
          client_name: verification.client_name || "-",
          customer_signed_by:
            verification.customer_signed_by || null,
          customer_signed_at:
            verification.customer_signed_at || null,
          approved_at: verification.approved_at || null,
          finalized_at: verification.finalized_at || null,
        });
      } catch (err: any) {
        console.error(err);

        setError(
          err?.message ||
            "حدث خطأ أثناء التحقق من الوثيقة."
        );
      } finally {
        setLoading(false);
      }
    }

    verifyContract();
  }, [params]);

  function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-gray-100 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

          <h1 className="text-xl font-bold text-gray-900">
            جاري التحقق من الوثيقة
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            يرجى الانتظار...
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-gray-100 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
            ✕
          </div>

          <h1 className="text-2xl font-bold text-red-700">
            تعذر التحقق من الوثيقة
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-600">
            {error}
          </p>

          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
            إذا وصلت إلى هذه الصفحة من خلال QR Code الموجود على العقد،
            تأكد من أن الرابط لم يتم تعديله.
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

          {/* Header */}
          <div className="bg-green-700 px-6 py-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-green-700 shadow">
              ✓
            </div>

            <h1 className="text-2xl font-bold">
              وثيقة أصلية ومعتمدة
            </h1>

            <p className="mt-2 text-sm text-green-100">
              تم التحقق من الوثيقة إلكترونيًا بواسطة نظام رمز الإمارات
            </p>
          </div>

          {/* Verification Code */}
          <div className="border-b border-gray-200 px-6 py-6 text-center">
            <p className="text-xs font-medium text-gray-500">
              Verification Code
            </p>

            <div className="mt-2 rounded-xl bg-gray-50 px-4 py-3 font-mono text-lg font-bold tracking-wider text-gray-900">
              {data.verification_code}
            </div>
          </div>

          {/* Document Information */}
          <div className="px-6 py-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              معلومات الوثيقة
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">
                  رقم العقد
                </div>

                <div className="mt-1 font-bold text-gray-900">
                  {data.contract_number}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">
                  اسم العقد
                </div>

                <div className="mt-1 font-bold text-gray-900">
                  {data.contract_name}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">
                  العميل
                </div>

                <div className="mt-1 font-bold text-gray-900">
                  {data.client_name}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">
                  الحالة
                </div>

                <div className="mt-1 font-bold text-green-700">
                  معتمد ونهائي
                </div>
              </div>

            </div>
          </div>

          {/* Signing Information */}
          <div className="border-t border-gray-200 px-6 py-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              معلومات الاعتماد
            </h2>

            <div className="space-y-3">

              <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
                <span className="text-sm text-gray-500">
                  ممثل العميل
                </span>

                <span className="text-sm font-bold text-gray-900">
                  {data.customer_signed_by || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
                <span className="text-sm text-gray-500">
                  توقيع العميل
                </span>

                <span className="text-sm font-bold text-green-700">
                  تم التوقيع
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
                <span className="text-sm text-gray-500">
                  تاريخ توقيع العميل
                </span>

                <span className="text-sm font-bold text-gray-900">
                  {formatDate(data.customer_signed_at)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
                <span className="text-sm text-gray-500">
                  اعتماد رمز الإمارات
                </span>

                <span className="text-sm font-bold text-gray-900">
                  {formatDate(data.approved_at)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-green-50 p-4">
                <span className="text-sm text-green-700">
                  تاريخ الإنهاء النهائي
                </span>

                <span className="text-sm font-bold text-green-800">
                  {formatDate(data.finalized_at)}
                </span>
              </div>

            </div>
          </div>

          {/* Company */}
          <div className="border-t border-gray-200 px-6 py-6 text-center">
            <div className="text-sm font-bold text-gray-900">
              شركة رمز الإمارات لفحص التربة والخرسانة
            </div>

            <div className="mt-1 text-xs text-gray-500">
              نظام التحقق الإلكتروني من الوثائق
            </div>
          </div>

        </div>

        <div className="mt-5 text-center text-xs text-gray-400">
          هذه الصفحة مخصصة للتحقق من أصالة الوثيقة فقط.
        </div>
      </div>
    </main>
  );
}