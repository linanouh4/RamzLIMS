"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getSavedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: number;
  contract_number: string | null;
  contract_name: string | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  status: string | null;
  description: string | null;
  clients:
    | {
        id?: number;
        client_name: string | null;
        phone: string | null;
        city: string | null;
        contact_person: string | null;
      }
    | {
        id?: number;
        client_name: string | null;
        phone: string | null;
        city: string | null;
        contact_person: string | null;
      }[]
    | null;
};

type Signing = {
  id: number;
  contract_id: number;
  signing_token: string;
  status: string;
  verification_code: string | null;
  customer_signed_by: string | null;
  customer_signature: string | null;
  customer_stamp_url: string | null;
  customer_signed_at: string | null;
  approved_by: number | null;
  ramz_signature: string | null;
  ramz_stamp_url: string | null;
  approved_at: string | null;
  ramz_signed_at: string | null;
  ramz_stamped_at: string | null;
  finalized_at: string | null;
};

type CurrentUser = {
  id: number;
  full_name: string;
  role: string;
  signature: string | null;
};

function getClient(client: Contract["clients"] | null | undefined) {
  if (Array.isArray(client)) {
    return client[0] || {
      client_name: null,
      phone: null,
      city: null,
      contact_person: null,
    };
  }

  return client || {
    client_name: null,
    phone: null,
    city: null,
    contact_person: null,
  };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Adds a contract-specific verification panel to a separate copy of the
 * selected stamp. The original uploaded image is never modified.
 */
async function addVerificationWatermark(
  imageSource: string,
  verificationCode: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (!imageSource.startsWith("data:") && !imageSource.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;

        if (!width || !height) {
          reject(new Error("تعذر قراءة أبعاد صورة الختم."));
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("تعذر تجهيز علامة التحقق على الختم."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const navy = "#17365D";
        const inset = Math.max(3, Math.round(width * 0.012));
        const bandHeight = Math.min(
          Math.round(height * 0.62),
          Math.max(112, Math.round(height * 0.48))
        );
        const bandY = height - bandHeight;
        const panelWidth = width - inset * 2;

        context.save();
        context.fillStyle = "rgba(255,255,255,0.94)";
        context.fillRect(inset, bandY, panelWidth, bandHeight - inset);
        context.strokeStyle = navy;
        context.lineWidth = Math.max(1, Math.round(width * 0.003));
        context.strokeRect(inset, bandY, panelWidth, bandHeight - inset);
        context.fillStyle = navy;
        context.textAlign = "center";
        context.textBaseline = "middle";

        const scale = Math.max(0.65, Math.min(1.5, width / 360));
        const companySize = Math.max(10, Math.round(17 * scale));
        const labelSize = Math.max(9, Math.round(12 * scale));
        const codeSize = Math.max(13, Math.round(22 * scale));
        const arabicSize = Math.max(9, Math.round(12 * scale));
        const englishSize = Math.max(7, Math.round(9 * scale));

        context.direction = "ltr";
        context.font = `700 ${companySize}px Arial, sans-serif`;
        context.fillText("RAMZ ALEMARAT", width / 2, bandY + bandHeight * 0.14, panelWidth * 0.94);

        context.direction = "rtl";
        context.font = `600 ${labelSize}px Arial, sans-serif`;
        context.fillText("رقم التحقق", width / 2, bandY + bandHeight * 0.31, panelWidth * 0.94);

        context.direction = "ltr";
        context.font = `700 ${codeSize}px Arial, sans-serif`;
        context.fillText(verificationCode, width / 2, bandY + bandHeight * 0.49, panelWidth * 0.94);

        context.direction = "rtl";
        context.font = `600 ${arabicSize}px Arial, sans-serif`;
        context.fillText(
          "هذا الختم معتمد لهذا العقد فقط",
          width / 2,
          bandY + bandHeight * 0.68,
          panelWidth * 0.94
        );

        context.direction = "ltr";
        context.font = `600 ${englishSize}px Arial, sans-serif`;
        context.fillText(
          "THIS STAMP IS VALID FOR THIS CONTRACT ONLY",
          width / 2,
          bandY + bandHeight * 0.85,
          panelWidth * 0.94
        );

        context.restore();
        resolve(canvas.toDataURL("image/png"));
      } catch {
        reject(
          new Error(
            "تعذر إضافة بيانات التحقق إلى الختم. أعيدي رفع صورة الختم الأصلية ثم حاولي مرة أخرى."
          )
        );
      }
    };

    image.onerror = () => {
      reject(
        new Error(
          "تعذر فتح صورة الختم لإضافة بيانات التحقق. أعيدي رفع صورة الختم الأصلية ثم حاولي مرة أخرى."
        )
      );
    };

    image.src = imageSource;
  });
}

export default function ContractApprovalAdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);
  const [signing, setSigning] = useState<Signing | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [ramzStamp, setRamzStamp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadPage() {
    if (!id) {
      setLoading(false);
      setError("رقم العقد غير موجود في الرابط.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const savedUser = getSavedUser();
      if (!savedUser?.id) {
        router.push("/login");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, full_name, role, signature")
        .eq("id", savedUser.id)
        .single();

      if (userError) throw userError;

      const user: CurrentUser = {
        id: Number(userData.id),
        full_name: String(userData.full_name || ""),
        role: String(userData.role || ""),
        signature: userData.signature || null,
      };
      setCurrentUser(user);

      if (user.role.toLowerCase() !== "admin") {
        setError("هذه الصفحة مخصصة لمدير النظام فقط.");
        return;
      }

      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select(`
          id,
          contract_number,
          contract_name,
          start_date,
          end_date,
          contract_value,
          status,
          description,
          clients (
            id,
            client_name,
            phone,
            city,
            contact_person
          )
        `)
        .eq("id", Number(id))
        .single();

      if (contractError) throw contractError;

      const { data: signingData, error: signingError } = await supabase
        .from("contract_signing")
        .select(`
          id,
          contract_id,
          signing_token,
          status,
          verification_code,
          customer_signed_by,
          customer_signature,
          customer_stamp_url,
          customer_signed_at,
          approved_by,
          ramz_signature,
          ramz_stamp_url,
          approved_at,
          ramz_signed_at,
          ramz_stamped_at,
          finalized_at
        `)
        .eq("contract_id", Number(id))
        .single();

      if (signingError) throw signingError;

      setContract(contractData as Contract);
      setSigning(signingData as Signing);
      if (signingData?.ramz_stamp_url) {
        setRamzStamp(signingData.ramz_stamp_url);
      }
    } catch (err: unknown) {
  let message = "حدث خطأ غير معروف أثناء اعتماد العقد.";

  if (err instanceof Error) {
    message = err.message;
  } else if (err && typeof err === "object") {
    const errorObject = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    message = [
      errorObject.message,
      errorObject.details,
      errorObject.hint,
      errorObject.code ? `رمز الخطأ: ${errorObject.code}` : "",
    ]
      .filter(Boolean)
      .join(" | ") || message;
  }

  setError(message);
  console.error("Contract approval error:", err);
} finally {
  setSaving(false);
}
  }

  function handleStampUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("يرجى اختيار صورة لختم الشركة.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("حجم صورة الختم يجب ألا يتجاوز 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) {
        setError("تعذر قراءة صورة الختم.");
        return;
      }
      setRamzStamp(result);
    };
    reader.onerror = () => setError("حدث خطأ أثناء قراءة صورة الختم.");
    reader.readAsDataURL(file);
  }

  async function approveContract() {
    if (!contract || !signing || !currentUser) {
      setError("لا يمكن اعتماد العقد لأن بيانات العقد أو المستخدم لم تكتمل.");
      return;
    }

    if (saving) return;

    if (currentUser.role.toLowerCase() !== "admin") {
      setError("ليس لديك صلاحية اعتماد العقود.");
      return;
    }

    if (signing.status !== "Pending Ramz Approval") {
      setError(`لا يمكن اعتماد العقد لأن حالته الحالية هي: ${signing.status}`);
      return;
    }

    if (!signing.customer_signature || !signing.customer_signed_at || !signing.customer_stamp_url) {
      setError("توقيع العميل وختمه وتاريخ توقيعه يجب أن تكون موجودة قبل الاعتماد.");
      return;
    }

    if (!currentUser.signature) {
      setError("لا يوجد توقيع محفوظ لحسابك. أضيفي توقيعك من إدارة المستخدمين أولًا.");
      return;
    }

    if (!ramzStamp) {
      setError("يرجى رفع ختم رامز قبل اعتماد العقد.");
      return;
    }

    const confirmed = window.confirm(
      "هل أنتِ متأكدة من اعتماد وتوقيع العقد؟\n\nبعد الاعتماد سيصبح العقد نهائيًا."
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Reserve a server-generated code. It is not written to contract_signing yet.
      const { data: reservedCodeData, error: reserveError } = await supabase.rpc(
        "reserve_contract_verification_code",
        { p_signing_id: signing.id }
      );

      if (reserveError) throw reserveError;

      const verificationCode = String(reservedCodeData || "").trim();
      if (!verificationCode || !/^RMZ-\d{4}-[A-Z0-9]{10}$/.test(verificationCode)) {
        throw new Error("لم تُرجع قاعدة البيانات رقم تحقق صالحًا. لم يتم اعتماد العقد.");
      }

      // Make a separate copy of the stamp with the exact reserved server code.
      const watermarkedStamp = await addVerificationWatermark(ramzStamp, verificationCode);

      // The RPC validates the reservation and atomically finalizes both records.
      const { data: finalizedData, error: finalizeError } = await supabase.rpc(
        "finalize_contract_signing",
        {
          p_signing_id: signing.id,
          p_ramz_stamp: watermarkedStamp,
          p_verification_code: verificationCode,
        }
      );

      if (finalizeError) throw finalizeError;

      const finalizedResult = Array.isArray(finalizedData) ? finalizedData[0] : null;
      if (
        !finalizedResult ||
        !finalizedResult.finalized_at ||
        finalizedResult.verification_code !== verificationCode
      ) {
        throw new Error("لم تُرجع قاعدة البيانات نتيجة اعتماد مطابقة للرمز المحجوز.");
      }

      const finalizedAt = finalizedResult.finalized_at;
      setSuccess("تم اعتماد العقد وتوقيعه وختمه من رامز بنجاح.");

      setSigning((previous) =>
        previous
          ? {
              ...previous,
              status: "Finalized",
              verification_code: verificationCode,
              approved_by: currentUser.id,
              ramz_signature: currentUser.signature,
              ramz_stamp_url: watermarkedStamp,
              approved_at: finalizedAt,
              ramz_signed_at: finalizedAt,
              ramz_stamped_at: finalizedAt,
              finalized_at: finalizedAt,
            }
          : previous
      );

      setContract((previous) => previous ? { ...previous, status: "Finalized" } : previous);
      await loadPage();
   
} catch (err: unknown) {
  let message = "";

  if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === "string") {
    message = err;
  } else {
    try {
      message = JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2);
    } catch {
      message = String(err);
    }
  }

  console.error("CONTRACT APPROVAL ERROR:", err);
  setError(message || "وصل خطأ بلا تفاصيل من النظام.");
} finally {
  setSaving(false);
}

  }

  function printContract() {
    window.print();
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="rounded-2xl bg-white px-8 py-6 shadow">جاري تحميل العقد...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !contract) {
    return (
      <ProtectedRoute>
        <div dir="rtl" className="min-h-screen bg-gray-50 p-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
            <div className="mb-2 text-lg font-bold">تعذر تحميل العقد</div>
            <div>{error}</div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-5 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white"
            >
              ← رجوع
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!contract || !signing || !currentUser) return null;

  const client = getClient(contract.clients);
  const isAdmin = currentUser.role.toLowerCase() === "admin";
  const isPending = signing.status === "Pending Ramz Approval";
  const isFinalized = signing.status === "Finalized";

  return (
    <ProtectedRoute>
      <main dir="rtl" className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="no-print mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl font-bold text-gray-700 hover:bg-gray-100"
              >
                ←
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">اعتماد عقد العميل</h1>
                <p className="mt-1 text-sm text-gray-500">مراجعة توقيع العميل واعتماد العقد من رامز الإمارات</p>
              </div>
            </div>
            <button
              type="button"
              onClick={printContract}
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              🖨 طباعة
            </button>
          </div>

          {error && (
            <div className="no-print mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="no-print mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
              {success}
            </div>
          )}

          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-gray-500">حالة التوقيع</div>
                <div className="mt-1 text-xl font-bold text-gray-900">{signing.status}</div>
              </div>
              <div className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${
                isFinalized ? "bg-green-100 text-green-700" : isPending ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
              }`}>
                {isFinalized ? "✓ عقد نهائي" : isPending ? "بانتظار اعتماد رامز" : signing.status}
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-gray-900">بيانات العقد</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <Info label="رقم العقد" value={contract.contract_number || "-"} />
              <Info label="اسم العقد" value={contract.contract_name || "-"} />
              <Info label="العميل" value={client.client_name || "-"} />
              <Info label="ممثل العميل" value={client.contact_person || "-"} />
              <Info label="بداية العقد" value={formatDate(contract.start_date)} />
              <Info label="نهاية العقد" value={formatDate(contract.end_date)} />
              <Info label="قيمة العقد" value={contract.contract_value != null ? `${Number(contract.contract_value).toLocaleString("en-US")} ريال` : "-"} />
              <Info label="وصف العقد" value={contract.description || "-"} />
            </div>
          </section>

          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-gray-900">توقيع العميل</h2>
            <div className="mb-5 rounded-xl bg-gray-50 p-4">
              <div className="text-sm text-gray-500">اسم الموقع</div>
              <div className="mt-1 text-lg font-bold">{signing.customer_signed_by || "-"}</div>
              {signing.customer_signed_at && (
                <div className="mt-2 text-xs text-gray-500">تاريخ التوقيع: {formatDateTime(signing.customer_signed_at)}</div>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <ImagePanel title="توقيع العميل" src={signing.customer_signature} alt="توقيع العميل" />
              <ImagePanel title="ختم العميل" src={signing.customer_stamp_url} alt="ختم العميل" />
            </div>
          </section>

          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-gray-900">اعتماد رامز الإمارات</h2>
            {!isAdmin && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                لا تملك صلاحية اعتماد العقود. الاعتماد متاح لمدير النظام فقط.
              </div>
            )}

            {isAdmin && (
              <>
                <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="font-bold text-blue-900">المعتمد الحالي</div>
                  <div className="mt-1 text-blue-800">{currentUser.full_name}</div>
                  <div className="mt-1 text-xs text-blue-700">سيتم استخدام التوقيع المحفوظ في حسابك.</div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <ImagePanel title="توقيع رامز" src={currentUser.signature} alt="توقيع رامز" />
                  <div>
                    <div className="mb-3 text-sm font-bold text-gray-700">ختم رامز</div>
                    <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
                      {ramzStamp ? (
                        <img src={ramzStamp} alt="ختم رامز" className="max-h-36 max-w-full object-contain" />
                      ) : (
                        <>
                          <div className="text-3xl">🏢</div>
                          <div className="mt-2 font-bold text-gray-700">اضغطي لاختيار ختم رامز</div>
                          <div className="mt-1 text-xs text-gray-500">PNG / JPG حتى 5 MB</div>
                        </>
                      )}
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleStampUpload} className="hidden" />
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      ستُنشأ نسخة خاصة بهذا العقد تتضمن رمز التحقق. صورة الختم الأصلية لا تتغير.
                    </p>
                  </div>
                </div>

                {isPending && (
                  <button
                    type="button"
                    onClick={approveContract}
                    disabled={saving}
                    className="no-print mt-8 w-full rounded-xl bg-green-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {saving ? "جاري تجهيز الختم واعتماد العقد..." : "✓ اعتماد وتوقيع وختم العقد"}
                  </button>
                )}

                {isFinalized && (
                  <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5">
                    <div className="font-bold text-green-900">✓ العقد معتمد ونهائي</div>
                    <div className="mt-2 text-sm text-green-800">
                      تم اعتماد العقد بتاريخ {formatDateTime(signing.finalized_at)}
                    </div>
                    {signing.verification_code && (
                      <div className="mt-2 text-sm font-bold text-green-900">
                        رقم التحقق: <span dir="ltr">{signing.verification_code}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {(signing.ramz_signature || signing.ramz_stamp_url) && (
            <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-bold text-gray-900">اعتماد رامز النهائي</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <ImagePanel title="توقيع رامز" src={signing.ramz_signature} alt="توقيع رامز" />
                  {signing.ramz_signed_at && (
                    <div className="mt-3 text-xs text-gray-500">تاريخ التوقيع: {formatDateTime(signing.ramz_signed_at)}</div>
                  )}
                </div>
                <div className="rounded-xl border p-4">
                  <ImagePanel title="ختم رامز" src={signing.ramz_stamp_url} alt="ختم رامز" />
                  {signing.ramz_stamped_at && (
                    <div className="mt-3 text-xs text-gray-500">تاريخ الختم: {formatDateTime(signing.ramz_stamped_at)}</div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        <style jsx global>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            main { padding: 0 !important; }
            .shadow-sm, .shadow { box-shadow: none !important; }
          }
        `}</style>
      </main>
    </ProtectedRoute>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

function ImagePanel({ title, src, alt }: { title: string; src: string | null | undefined; alt: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-3 text-sm font-bold text-gray-600">{title}</div>
      <div className="flex h-48 items-center justify-center rounded-xl border bg-white">
        {src ? (
          <img src={src} alt={alt} className="max-h-44 max-w-full object-contain" />
        ) : (
          <span className="text-gray-400">لا يوجد {title}</span>
        )}
      </div>
    </div>
  );
}
