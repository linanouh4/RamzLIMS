"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/lib/supabase";

type ContractSigning = {
signing_id: number;
contract_id: number;
contract_number: string;
contract_name: string;
contract_start_date: string | null;
contract_end_date: string | null;
contract_value: number | null;
contract_status: string;
contract_description: string | null;

client_name: string;
client_contact_person: string | null;
client_phone: string | null;
client_email: string | null;
client_city: string | null;
client_address: string | null;

signing_status: string;
customer_signed_by: string | null;
customer_signature: string | null;
customer_stamp_url: string | null;
sent_at: string | null;
opened_at: string | null;
customer_signed_at: string | null;

approved_at: string | null;
ramz_signature: string | null;
ramz_stamp_url: string | null;
ramz_signed_at: string | null;
ramz_stamped_at: string | null;
finalized_at: string | null;
};

export default function ContractApprovalPage() {
const params = useParams();
const token = params?.token as string;

const signatureRef = useRef<SignatureCanvas | null>(null);

const [contract, setContract] = useState<ContractSigning | null>(null);
const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);

const [customerName, setCustomerName] = useState("");
const [customerStamp, setCustomerStamp] = useState("");
const [stampPreview, setStampPreview] = useState("");

const [error, setError] = useState("");
const [success, setSuccess] = useState("");

const formatDate = (date: string | null) => {
if (!date) return "-";

return new Date(date).toLocaleDateString("ar-SA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});


};

const formatDateTime = (date: string | null) => {
if (!date) return "-";


return new Date(date).toLocaleString("ar-SA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});


};

const formatCurrency = (value: number | null) => {
if (value === null || value === undefined) return "-";


return new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 2,
}).format(value);


};

const loadContract = async () => {
if (!token) return;


setLoading(true);
setError("");

const { data, error: loadError } = await supabase.rpc(
  "get_public_contract_signing",
  {
    p_token: token,
  }
);

if (loadError) {
  console.error(loadError);
  setError("تعذر تحميل بيانات العقد. قد يكون الرابط غير صحيح أو منتهي الصلاحية.");
  setLoading(false);
  return;
}

const row = Array.isArray(data) ? data[0] : data;

if (!row) {
  setError("العقد غير موجود أو أن رابط التوقيع غير صالح.");
  setLoading(false);
  return;
}

setContract(row as ContractSigning);

if (row.customer_signed_by) {
  setCustomerName(row.customer_signed_by);
}

if (row.customer_stamp_url) {
  setStampPreview(row.customer_stamp_url);
}

setLoading(false);

if (row.signing_status !== "Finalized") {
  const { error: openedError } = await supabase.rpc(
    "mark_public_contract_signing_opened",
    {
      p_token: token,
    }
  );

  if (openedError) {
    console.error("Open tracking error:", openedError);
  }
}


};

useEffect(() => {
loadContract();
}, [token]);

const clearSignature = () => {
signatureRef.current?.clear();
};

const handleStampUpload = (
event: React.ChangeEvent<HTMLInputElement>
) => {
const file = event.target.files?.[0];


if (!file) return;

if (!file.type.startsWith("image/")) {
  setError("يرجى اختيار ملف صورة للختم.");
  return;
}

if (file.size > 5 * 1024 * 1024) {
  setError("حجم صورة الختم يجب ألا يتجاوز 5 MB.");
  return;
}

setError("");

const reader = new FileReader();

reader.onload = () => {
  const result = reader.result as string;

  setCustomerStamp(result);
  setStampPreview(result);
};

reader.readAsDataURL(file);


};

const submitSignature = async () => {
if (!contract) return;


setError("");
setSuccess("");

if (!customerName.trim()) {
  setError("يرجى إدخال اسم ممثل العميل.");
  return;
}

if (!signatureRef.current || signatureRef.current.isEmpty()) {
  setError("يرجى التوقيع قبل إرسال العقد.");
  return;
}

if (!customerStamp) {
  setError("يرجى رفع ختم الشركة.");
  return;
}

setSubmitting(true);

try {
  const signature = signatureRef.current.toDataURL("image/png");

  const { data, error: submitError } = await supabase.rpc(
    "submit_public_contract_signing",
    {
      p_token: token,
      p_customer_name: customerName.trim(),
      p_customer_signature: signature,
      p_customer_stamp: customerStamp,
    }
  );

  if (submitError) {
    console.error(submitError);
    throw new Error(
      submitError.message || "تعذر إرسال التوقيع."
    );
  }

  setSuccess(
    "تم توقيع العقد وإرساله إلى شركة رامز للمراجعة والاعتماد بنجاح."
  );

  const result = Array.isArray(data) ? data[0] : data;

  if (result?.status) {
    setContract((current) =>
      current
        ? {
            ...current,
            signing_status: result.status,
            customer_signed_by: customerName.trim(),
            customer_signature: signature,
            customer_stamp_url: customerStamp,
            customer_signed_at:
              result.customer_signed_at ||
              new Date().toISOString(),
          }
        : current
    );
  } else {
    await loadContract();
  }
} catch (err) {
  console.error(err);

  setError(
    err instanceof Error
      ? err.message
      : "حدث خطأ أثناء إرسال التوقيع."
  );
} finally {
  setSubmitting(false);
}


};

const isAlreadySigned =
contract?.signing_status === "Pending Ramz Approval" ||
contract?.signing_status === "Approved" ||
contract?.signing_status === "Finalized";

const statusLabel = () => {
if (!contract) return "";


switch (contract.signing_status) {
  case "Draft":
    return "مسودة";

  case "Sent":
    return "بانتظار فتح العقد";

  case "Opened":
    return "بانتظار توقيع العميل";

  case "Customer Signed":
    return "تم توقيع العميل";

  case "Pending Ramz Approval":
    return "بانتظار اعتماد رامز";

  case "Approved":
    return "تم اعتماد العقد";

  case "Finalized":
    return "العقد نهائي";

  default:
    return contract.signing_status;
}


};

if (loading) {
return ( <main
     dir="rtl"
     className="min-h-screen bg-slate-100 flex items-center justify-center p-6"
   > <div className="bg-white rounded-2xl shadow-lg p-8 text-center"> <div className="text-lg font-bold text-slate-800">
جاري تحميل العقد... </div>

      <div className="text-sm text-slate-500 mt-2">
        يرجى الانتظار
      </div>
    </div>
  </main>
);


}

if (error && !contract) {
return ( <main
     dir="rtl"
     className="min-h-screen bg-slate-100 flex items-center justify-center p-6"
   > <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center"> <div className="text-5xl mb-4">⚠️</div>


      <h1 className="text-xl font-bold text-red-700 mb-3">
        تعذر فتح العقد
      </h1>

      <p className="text-slate-600 leading-8">
        {error}
      </p>
    </div>
  </main>
);


}

if (!contract) return null;

return (
<> <style jsx global>{`
@media print {
body {
background: white !important;
}


      .no-print {
        display: none !important;
      }

      .print-page {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: none !important;
      }

      @page {
        size: A4;
        margin: 12mm;
      }
    }
  `}</style>

  <main
    dir="rtl"
    className="min-h-screen bg-slate-100 py-8 px-4"
  >
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="print-page bg-white rounded-2xl shadow-xl overflow-hidden">

        <div className="border-b-4 border-slate-800 p-6">
          <div className="grid grid-cols-3 gap-4 items-center">

            <div className="text-right">
              <div className="text-xl font-black text-slate-900">
                رامز الإمارات
              </div>

              <div className="text-sm text-slate-500 mt-1">
                مختبر التربة والخرسانة
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-black text-slate-900">
                عقد عميل
              </div>

              <div className="text-sm text-slate-500 mt-1">
                Customer Contract
              </div>
            </div>

            <div className="text-left text-xs text-slate-600">
              <div>
                <span className="font-bold">Document Code:</span>{" "}
                QF 701/01
              </div>

              <div>
                <span className="font-bold">Revision:</span>{" "}
                1/3
              </div>

              <div>
                <span className="font-bold">Issue Date:</span>{" "}
                31/12/2023
              </div>
            </div>

          </div>
        </div>

        {/* Contract title */}
        <div className="p-6 border-b bg-slate-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <div className="text-sm text-slate-500">
                رقم العقد
              </div>

              <div className="text-2xl font-black text-slate-900">
                {contract.contract_number}
              </div>
            </div>

            <div className="text-right md:text-left">
              <div className="text-sm text-slate-500">
                حالة التوقيع
              </div>

              <span className="inline-flex mt-1 px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                {statusLabel()}
              </span>
            </div>

          </div>

          <div className="mt-5">
            <h1 className="text-xl font-bold text-slate-900">
              {contract.contract_name}
            </h1>
          </div>
        </div>

        {/* Contract information */}
        <div className="p-6">

          <h2 className="text-lg font-bold text-slate-900 border-b pb-3 mb-5">
            بيانات العقد
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">
                اسم العميل
              </div>

              <div className="font-bold text-slate-900">
                {contract.client_name}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">
                ممثل العميل
              </div>

              <div className="font-bold text-slate-900">
                {contract.client_contact_person || "-"}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">
                المدينة
              </div>

              <div className="font-bold text-slate-900">
                {contract.client_city || "-"}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">
                الهاتف
              </div>

              <div className="font-bold text-slate-900">
                {contract.client_phone || "-"}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">
                تاريخ بداية العقد
              </div>

              <div className="font-bold text-slate-900">
                {formatDate(contract.contract_start_date)}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">
                تاريخ نهاية العقد
              </div>

              <div className="font-bold text-slate-900">
                {formatDate(contract.contract_end_date)}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">
                قيمة العقد
              </div>

              <div className="font-bold text-slate-900">
                {formatCurrency(contract.contract_value)}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">
                البريد الإلكتروني
              </div>

              <div className="font-bold text-slate-900 break-all">
                {contract.client_email || "-"}
              </div>
            </div>

          </div>

          {/* Description */}
          {contract.contract_description && (
            <div className="mt-6">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-3 mb-4">
                تفاصيل العقد
              </h2>

              <div className="bg-white border rounded-xl p-5 leading-8 text-slate-700 whitespace-pre-wrap">
                {contract.contract_description}
              </div>
            </div>
          )}

          {/* Existing signature */}
          {isAlreadySigned && contract.customer_signature && (
            <div className="mt-8 border-t pt-8">

              <h2 className="text-lg font-bold text-slate-900 mb-5">
                توقيع العميل
              </h2>

              <div className="grid md:grid-cols-2 gap-6">

                <div className="border rounded-xl p-5">
                  <div className="text-sm text-slate-500 mb-3">
                    اسم ممثل العميل
                  </div>

                  <div className="font-bold text-slate-900 mb-5">
                    {contract.customer_signed_by}
                  </div>

                  <div className="text-sm text-slate-500 mb-2">
                    التوقيع الإلكتروني
                  </div>

                  <div className="h-40 border rounded-lg flex items-center justify-center bg-white">
                    <img
                      src={contract.customer_signature}
                      alt="توقيع العميل"
                      className="max-h-36 max-w-full object-contain"
                    />
                  </div>

                  <div className="text-xs text-slate-500 mt-3">
                    تاريخ التوقيع:{" "}
                    {formatDateTime(contract.customer_signed_at)}
                  </div>
                </div>

                <div className="border rounded-xl p-5">
                  <div className="text-sm text-slate-500 mb-3">
                    ختم الشركة
                  </div>

                  <div className="h-40 border rounded-lg flex items-center justify-center bg-white">
                    {contract.customer_stamp_url ? (
                      <img
                        src={contract.customer_stamp_url}
                        alt="ختم العميل"
                        className="max-h-36 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-400">
                        لا يوجد ختم
                      </span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Customer signing form */}
          {!isAlreadySigned && (
            <div className="no-print mt-10 border-t pt-8">

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                <div className="font-bold text-blue-900 mb-2">
                  إقرار وتوقيع العميل
                </div>

                <div className="text-sm text-blue-800 leading-7">
                  أقر بأنني ممثل العميل المخول بالتوقيع على هذا العقد،
                  وأن البيانات الموضحة أعلاه قد تمت مراجعتها والموافقة
                  عليها، وأوافق على استخدام التوقيع الإلكتروني المرفق
                  لإثبات موافقتي على العقد.
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-5">
                  {success}
                </div>
              )}

              <div className="space-y-7">

                {/* Name */}
                <div>
                  <label className="block font-bold text-slate-800 mb-2">
                    اسم ممثل العميل *
                  </label>

                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) =>
                      setCustomerName(e.target.value)
                    }
                    placeholder="أدخل الاسم الكامل"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Signature */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-bold text-slate-800">
                      التوقيع الإلكتروني *
                    </label>

                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-sm text-red-600 font-bold"
                      disabled={submitting}
                    >
                      مسح التوقيع
                    </button>
                  </div>

                  <div className="border-2 border-slate-300 rounded-xl bg-white overflow-hidden">
                    <SignatureCanvas
                      ref={signatureRef}
                      penColor="#111827"
                      canvasProps={{
                        className: "w-full h-52 cursor-crosshair",
                      }}
                    />
                  </div>

                  <div className="text-xs text-slate-500 mt-2">
                    استخدم الماوس أو شاشة اللمس للتوقيع داخل المربع.
                  </div>
                </div>

                {/* Stamp */}
                <div>
                  <label className="block font-bold text-slate-800 mb-2">
                    ختم الشركة *
                  </label>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleStampUpload}
                    disabled={submitting}
                    className="w-full border border-slate-300 rounded-xl p-3 bg-white"
                  />

                  <div className="text-xs text-slate-500 mt-2">
                    PNG أو JPG أو WEBP، وبحد أقصى 5 MB.
                  </div>

                  {stampPreview && (
                    <div className="mt-4 border rounded-xl bg-white p-5">
                      <div className="text-sm font-bold text-slate-600 mb-3">
                        معاينة الختم
                      </div>

                      <div className="h-44 flex items-center justify-center">
                        <img
                          src={stampPreview}
                          alt="معاينة ختم الشركة"
                          className="max-h-40 max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={submitSignature}
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl py-4 transition"
                >
                  {submitting
                    ? "جاري إرسال التوقيع..."
                    : "توقيع العقد وإرساله إلى رامز"}
                </button>

              </div>
            </div>
          )}

          {/* Already signed message */}
          {isAlreadySigned && (
            <div className="no-print mt-8 bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="font-bold text-green-900 mb-2">
                تم استلام توقيع العميل
              </div>

              <div className="text-sm text-green-800 leading-7">
                تم استلام التوقيع والختم بنجاح، والعقد حاليًا{" "}
                <strong>{statusLabel()}</strong>.
                لا يمكن تعديل التوقيع من خلال هذا الرابط.
              </div>
            </div>
          )}

          {/* Approval info */}
          {(contract.approved_at ||
            contract.ramz_signature ||
            contract.ramz_stamp_url) && (
            <div className="mt-10 border-t pt-8">

              <h2 className="text-lg font-bold text-slate-900 mb-5">
                اعتماد رامز
              </h2>

              <div className="grid md:grid-cols-2 gap-6">

                {contract.ramz_signature && (
                  <div className="border rounded-xl p-5">
                    <div className="text-sm text-slate-500 mb-3">
                      توقيع رامز
                    </div>

                    <div className="h-40 border rounded-lg flex items-center justify-center">
                      <img
                        src={contract.ramz_signature}
                        alt="توقيع رامز"
                        className="max-h-36 max-w-full object-contain"
                      />
                    </div>

                    {contract.ramz_signed_at && (
                      <div className="text-xs text-slate-500 mt-3">
                        تاريخ التوقيع:{" "}
                        {formatDateTime(contract.ramz_signed_at)}
                      </div>
                    )}
                  </div>
                )}

                {contract.ramz_stamp_url && (
                  <div className="border rounded-xl p-5">
                    <div className="text-sm text-slate-500 mb-3">
                      ختم رامز
                    </div>

                    <div className="h-40 border rounded-lg flex items-center justify-center">
                      <img
                        src={contract.ramz_stamp_url}
                        alt="ختم رامز"
                        className="max-h-36 max-w-full object-contain"
                      />
                    </div>

                    {contract.ramz_stamped_at && (
                      <div className="text-xs text-slate-500 mt-3">
                        تاريخ الختم:{" "}
                        {formatDateTime(contract.ramz_stamped_at)}
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>
          )}

          {/* Footer */}
          <div className="mt-10 pt-5 border-t text-center text-xs text-slate-400">
            هذا المستند إلكتروني وتم إعداده من خلال نظام RamzLIMS.
          </div>

        </div>
      </div>

      {/* Print button */}
      <div className="no-print mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-white border border-slate-300 text-slate-800 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50"
        >
          طباعة / حفظ PDF
        </button>
      </div>

    </div>
  </main>
</>


);
}
