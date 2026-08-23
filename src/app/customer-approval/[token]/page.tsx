"use client";

import SignatureCanvas from "react-signature-canvas";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CustomerApprovalPage() {
  const params = useParams();
  const token = params.token as string;

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [signature, setSignature] = useState("");

  const signatureRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (token) {
      loadRequest();
    }
  }, [token]);

  async function loadRequest() {
    setLoading(true);

    const { data, error } = await supabase
      .from("external_test_requests")
      .select(`
        id,
        request_no,
        order_no,
        request_date,
        customer_name,
        sample_kind,
        quantity,
        requested_test,
        test_method,
        payment_method,
        status,
        customer_approval_status,
        customer_approved_by,
        customer_approved_at,
        customer_signature
      `)
      .eq("approval_token", token)
      .single();

    if (error) {
      console.error("LOAD APPROVAL REQUEST ERROR:", error);
      setRequest(null);
      setLoading(false);
      return;
    }

    setRequest(data);

    if (data.customer_approved_by) {
      setCustomerName(data.customer_approved_by);
    } else if (data.customer_name) {
      setCustomerName(data.customer_name);
    }

    setLoading(false);
  }

  async function approveRequest() {
    if (!customerName.trim()) {
      alert("الرجاء إدخال اسم العميل أو ممثل العميل");
      return;
    }

    if (!signatureRef.current) {
      alert("الرجاء توقيع الطلب");
      return;
    }

    if (signatureRef.current.isEmpty()) {
      alert("الرجاء توقيع الطلب قبل الاعتماد");
      return;
    }

    const signatureData = signatureRef.current
      .getCanvas()
      .toDataURL("image/png");

    if (request.customer_approval_status === "Approved") {
      alert("هذا الطلب معتمد مسبقًا.");
      return;
    }

    setApproving(true);

    try {
      const { data, error } = await supabase
        .from("external_test_requests")
        .update({
          customer_approval_status: "Approved",
          customer_approved_by: customerName.trim(),
          customer_approved_at: new Date().toISOString(),
          customer_signature: signatureData,
          status: "Customer Approved",
        })
        .eq("approval_token", token)
        .select(`
          id,
          request_no,
          order_no,
          request_date,
          customer_name,
          sample_kind,
          quantity,
          requested_test,
          test_method,
          payment_method,
          status,
          customer_approval_status,
          customer_approved_by,
          customer_approved_at,
          customer_signature
        `)
        .single();

      if (error) {
        console.error("APPROVE REQUEST ERROR:", error);

        alert(
          "حدث خطأ أثناء اعتماد الطلب:\n" +
            error.message
        );

        return;
      }

      if (data) {
        setRequest(data);
      }

      setSignature(signatureData);

      alert("تم اعتماد طلب الفحص بنجاح");
    } catch (error: any) {
      console.error("UNEXPECTED APPROVAL ERROR:", error);

      alert(
        "حدث خطأ غير متوقع:\n" +
          (error?.message || "خطأ غير معروف")
      );
    } finally {
      setApproving(false);
    }
  }

  function printRequest() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>جاري تحميل الطلب...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gray-100 p-6"
      >
        <div className="bg-white rounded-xl shadow p-8 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-3">
            الطلب غير موجود
          </h1>

          <p className="text-gray-600">
            رابط الموافقة غير صحيح أو أن الطلب لم يعد متاحًا.
          </p>
        </div>
      </div>
    );
  }

  const isApproved =
    request.customer_approval_status === "Approved";

  const savedSignature =
    request.customer_signature || signature;

  return (
    <>
      {/* =====================================================
          PRINT CSS
      ====================================================== */}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-card {
            background: #ffffff !important;
            box-shadow: none !important;
            border: 1px solid #000000 !important;
            border-radius: 0 !important;
            margin-bottom: 10px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-field {
            border: 1px solid #000000 !important;
            border-radius: 0 !important;
          }

          .print-header {
            border: 2px solid #000000 !important;
            border-radius: 0 !important;
          }

          .print-title {
            color: #000000 !important;
          }

          .print-status {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #000000 !important;
            border-radius: 0 !important;
          }

          .print-signature-box {
            min-height: 150px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-signature {
            display: block !important;
            max-width: 280px !important;
            width: auto !important;
            height: 120px !important;
            object-fit: contain !important;
            margin: 0 auto !important;
          }

          .print-footer {
            display: block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-only {
            display: block !important;
          }

          .grid {
            display: grid !important;
          }
        }

        @media screen {
          .print-only {
            display: none;
          }

          .print-footer {
            display: none;
          }
        }
      `}</style>

      {/* =====================================================
          MAIN PAGE
      ====================================================== */}

      <div
        dir="rtl"
        className="min-h-screen bg-gray-100 p-4 md:p-8"
      >
        <div className="print-container max-w-4xl mx-auto">

          {/* =================================================
              PRINT BUTTON
          ================================================== */}

          <div
            className="no-print"
            style={{
              display: "block",
              width: "100%",
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              onClick={printRequest}
              style={{
                display: "block",
                width: "100%",
                minHeight: "60px",
                backgroundColor: "#1d4ed8",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "16px 20px",
                fontSize: "20px",
                fontWeight: "700",
                cursor: "pointer",
                textAlign: "center",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              🖨️ طباعة طلب الفحص
            </button>
          </div>

          {/* =================================================
              HEADER
          ================================================== */}

          <div className="bg-white p-6 mb-6 print-card print-header">

            <div className="flex items-center justify-between gap-6">

              <div>
                <h1 className="text-3xl font-bold print-title">
                  شركة رمز الإمارات
                </h1>

                <h2 className="text-xl font-bold mt-2">
                  طلب فحص خارجي
                </h2>

                <p className="text-gray-500 mt-1">
                  External Test Request - QF 701/02
                </p>
              </div>

              <div className="border-2 border-blue-700 p-4 text-center print-field">

                <p className="text-sm text-gray-500">
                  رقم الطلب
                </p>

                <p className="text-xl font-bold">
                  {request.request_no || "-"}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              STATUS
          ================================================== */}

          <div className="bg-white p-6 mb-6 print-card">

            <div className="flex items-center justify-between gap-4">

              <span className="font-bold">
                حالة الطلب
              </span>

              <span
                className={`px-5 py-2 rounded-full font-bold print-status ${
                  isApproved
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {isApproved
                  ? "تم اعتماد الطلب"
                  : "بانتظار موافقة العميل"}
              </span>

            </div>

          </div>

          {/* =================================================
              REQUEST DETAILS
          ================================================== */}

          <div className="bg-white mb-6 print-card">

            <div className="border-b p-5">
              <h2 className="text-xl font-bold">
                بيانات طلب الفحص
              </h2>
            </div>

            <div className="p-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <Info
                  label="اسم العميل"
                  value={
                    request.customer_name || "-"
                  }
                />

                <Info
                  label="رقم طلب العميل"
                  value={
                    request.order_no || "-"
                  }
                />

                <Info
                  label="تاريخ الطلب"
                  value={
                    request.request_date || "-"
                  }
                />

                <Info
                  label="نوع العينة"
                  value={
                    request.sample_kind || "-"
                  }
                />

                <Info
                  label="عدد العينات"
                  value={
                    request.quantity ?? "-"
                  }
                />

                <Info
                  label="الاختبار المطلوب"
                  value={
                    request.requested_test || "-"
                  }
                />

                <Info
                  label="طريقة / مواصفة الاختبار"
                  value={
                    request.test_method || "-"
                  }
                />

                <Info
                  label="طريقة الدفع"
                  value={
                    request.payment_method || "-"
                  }
                />

              </div>

            </div>

          </div>

          {/* =================================================
              CUSTOMER DECLARATION
          ================================================== */}

          <div className="bg-white mb-6 print-card">

            <div className="border-b p-5">
              <h2 className="text-xl font-bold">
                إقرار وموافقة العميل
              </h2>
            </div>

            <div className="p-6">

              <div className="border p-5 leading-8">

                <p>
                  أقر أنا الموقع أدناه بأنني اطلعت
                  على بيانات طلب الفحص الموضحة أعلاه،
                  وأنها تمثل متطلبات الفحص المطلوبة،
                  وأوافق على تنفيذ الاختبارات المذكورة
                  وفقًا للبيانات الموضحة في الطلب.
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              APPROVAL FORM
          ================================================== */}

          {!isApproved && (
            <div className="bg-white p-6 mb-6 no-print">

              <h2 className="text-xl font-bold mb-5">
                موافقة العميل
              </h2>

              {/* CUSTOMER NAME */}

              <div className="mb-5">

                <label className="block font-bold mb-2">
                  اسم العميل / ممثل العميل
                </label>

                <input
                  type="text"
                  value={customerName}
                  onChange={(e) =>
                    setCustomerName(e.target.value)
                  }
                  className="w-full border rounded-lg p-3"
                  placeholder="اكتب الاسم الكامل"
                />

              </div>

              {/* SIGNATURE */}

              <div className="mb-5">

                <label className="block font-bold mb-2">
                  التوقيع الإلكتروني
                </label>

                <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">

                  <SignatureCanvas
                    ref={signatureRef}
                    penColor="black"
                    canvasProps={{
                      className:
                        "w-full h-48 touch-none",
                    }}
                  />

                </div>

                <button
                  type="button"
                  onClick={() => {
                    signatureRef.current?.clear();
                    setSignature("");
                  }}
                  className="mt-2 text-sm text-red-600"
                >
                  🗑️ مسح التوقيع
                </button>

              </div>

              {/* APPROVE */}

              <button
                type="button"
                onClick={approveRequest}
                disabled={approving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-lg"
              >
                {approving
                  ? "جاري اعتماد الطلب..."
                  : "✓ أوافق وأعتمد طلب الفحص"}
              </button>

            </div>
          )}

          {/* =================================================
              APPROVED SIGNATURE
          ================================================== */}

          {isApproved && (
            <div className="bg-white mb-6 print-card">

              <div className="border-b p-5">
                <h2 className="text-xl font-bold">
                  اعتماد العميل
                </h2>
              </div>

              <div className="p-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* NAME */}

                  <div className="border p-5 print-field">

                    <p className="text-sm text-gray-500 mb-2">
                      اسم العميل / ممثل العميل
                    </p>

                    <p className="font-bold text-lg">
                      {request.customer_approved_by ||
                        customerName ||
                        "-"}
                    </p>

                  </div>

                  {/* DATE */}

                  <div className="border p-5 print-field">

                    <p className="text-sm text-gray-500 mb-2">
                      تاريخ الاعتماد
                    </p>

                    <p className="font-bold">
                      {request.customer_approved_at
                        ? new Date(
                            request.customer_approved_at
                          ).toLocaleString("ar-SA")
                        : "-"}
                    </p>

                  </div>

                </div>

                {/* SIGNATURE */}

                <div className="border p-5 mt-6 print-field print-signature-box">

                  <p className="text-sm text-gray-500 mb-3">
                    توقيع العميل / ممثل العميل
                  </p>

                  {savedSignature ? (
                    <div className="flex justify-center items-center h-36">

                      <img
                        src={savedSignature}
                        alt="توقيع العميل"
                        className="print-signature max-h-32 max-w-full object-contain"
                      />

                    </div>
                  ) : (
                    <div className="h-36 flex items-center justify-center text-gray-400">
                      لا يوجد توقيع محفوظ
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              APPROVED MESSAGE
          ================================================== */}

          {isApproved && (
            <div className="no-print bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">

              <div className="text-5xl mb-3">
                ✓
              </div>

              <h2 className="text-2xl font-bold text-green-700">
                تم اعتماد طلب الفحص
              </h2>

              <p className="text-gray-600 mt-2">
                تم تسجيل الموافقة والتوقيع بنجاح.
              </p>

            </div>
          )}

          {/* =================================================
              SECOND PRINT BUTTON
              يظهر بعد الاعتماد
          ================================================== */}

          {isApproved && (
            <div
              className="no-print"
              style={{
                width: "100%",
                marginBottom: "24px",
              }}
            >
              <button
                type="button"
                onClick={printRequest}
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: "60px",
                  backgroundColor: "#111827",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  fontSize: "20px",
                  fontWeight: "700",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                🖨️ طباعة العقد مع توقيع العميل
              </button>
            </div>
          )}

          {/* =================================================
              PRINT FOOTER
          ================================================== */}

          {isApproved && (
            <div className="print-footer text-center border-t border-black pt-3 mt-5 text-sm">

              <p className="font-bold">
               شركة رمز الإمارات لفحص التربة والخرسانة
              </p>

              <p>
                External Test Request - QF 701/02
              </p>

              <p>
                رقم الطلب: {request.request_no || "-"}
              </p>

            </div>
          )}

        </div>
      </div>
    </>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border rounded-lg p-4 print-field">

      <p className="text-sm text-gray-500 mb-1">
        {label}
      </p>

      <p className="font-semibold break-words">
        {value}
      </p>

    </div>
  );
}