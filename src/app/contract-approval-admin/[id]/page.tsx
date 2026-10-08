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

function getClient(
  client: Contract["clients"] | null | undefined
): {
  client_name: string | null;
  phone: string | null;
  city: string | null;
  contact_person: string | null;
} {
  if (Array.isArray(client)) {
    return (
      client[0] || {
        client_name: null,
        phone: null,
        city: null,
        contact_person: null,
      }
    );
  }

  return (
    client || {
      client_name: null,
      phone: null,
      city: null,
      contact_person: null,
    }
  );
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

export default function ContractApprovalAdminPage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params?.id)
    ? params.id[0]
    : String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [contract, setContract] = useState<Contract | null>(null);
  const [signing, setSigning] = useState<Signing | null>(null);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [ramzStamp, setRamzStamp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadPage();
  }, [id]);

  async function loadPage() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const savedUser = getSavedUser();

      if (!savedUser?.id) {
        router.push("/login");
        return;
      }

      const { data: userData, error: userError } =
        await supabase
          .from("users")
          .select("id, full_name, role, signature")
          .eq("id", savedUser.id)
          .single();

      if (userError) {
        throw userError;
      }

      const user: CurrentUser = {
        id: Number(userData.id),
        full_name: String(userData.full_name || ""),
        role: String(userData.role || ""),
        signature: userData.signature || null,
      };

      setCurrentUser(user);

      if (user.role.toLowerCase() !== "admin") {
        setError("هذه الصفحة مخصصة لمدير النظام فقط.");
        setLoading(false);
        return;
      }

      const { data: contractData, error: contractError } =
        await supabase
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

      if (contractError) {
        throw contractError;
      }

      const { data: signingData, error: signingError } =
        await supabase
          .from("contract_signing")
          .select(`
            id,
            contract_id,
            signing_token,
            status,
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

      if (signingError) {
        throw signingError;
      }

      setContract(contractData as Contract);
      setSigning(signingData as Signing);

      if (signingData?.ramz_stamp_url) {
        setRamzStamp(signingData.ramz_stamp_url);
      }
    } catch (err: any) {
      console.error("LOAD CONTRACT ERROR:", err);

      setError(
        err?.message ||
          "حدث خطأ أثناء تحميل بيانات اعتماد العقد."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleStampUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
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

    reader.onerror = () => {
      setError("حدث خطأ أثناء قراءة صورة الختم.");
    };

    reader.readAsDataURL(file);
  }

  async function approveContract() {
    console.log("APPROVE BUTTON CLICKED");

    if (!contract || !signing || !currentUser) {
      setError(
        "لا يمكن اعتماد العقد لأن بيانات العقد أو المستخدم لم تكتمل."
      );
      return;
    }

    if (saving) {
      return;
    }

    if (currentUser.role.toLowerCase() !== "admin") {
      setError("ليس لديك صلاحية اعتماد العقود.");
      return;
    }

    if (signing.status !== "Pending Ramz Approval") {
      setError(
        `لا يمكن اعتماد العقد لأن حالته الحالية هي: ${signing.status}`
      );
      return;
    }

    if (!signing.customer_signature) {
      setError("لا يوجد توقيع من العميل على العقد.");
      return;
    }

    if (!currentUser.signature) {
      setError(
        "لا يوجد توقيع محفوظ لحسابك. أضيفي توقيعك من إدارة المستخدمين أولًا."
      );
      return;
    }

    if (!ramzStamp) {
      setError("يرجى رفع ختم رامز قبل اعتماد العقد.");
      return;
    }

    const confirmed = window.confirm(
      "هل أنتِ متأكدة من اعتماد وتوقيع العقد؟\n\nبعد الاعتماد سيصبح العقد نهائيًا."
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const now = new Date().toISOString();

      console.log("STARTING CONTRACT APPROVAL", {
        contractId: contract.id,
        signingId: signing.id,
        userId: currentUser.id,
        status: signing.status,
      });

      /*
       * أولاً: اعتماد سجل التوقيع
       */
      const { data: updatedSigning, error: signingUpdateError } =
        await supabase
          .from("contract_signing")
          .update({
            status: "Finalized",
            approved_by: currentUser.id,
            ramz_signature: currentUser.signature,
            ramz_stamp_url: ramzStamp,
            approved_at: now,
            ramz_signed_at: now,
            ramz_stamped_at: now,
            finalized_at: now,
          })
          .eq("id", signing.id)
          .eq("status", "Pending Ramz Approval")
          .select()
          .maybeSingle();

      console.log("SIGNING UPDATE RESULT:", {
        updatedSigning,
        signingUpdateError,
      });

      if (signingUpdateError) {
        throw signingUpdateError;
      }

      /*
       * إذا لم يرجع Supabase أي سجل،
       * فهذا يعني أن التحديث لم يحصل فعليًا.
       */
      if (!updatedSigning) {
        throw new Error(
          "لم يتم حفظ اعتماد العقد. ربما تغيرت حالة العقد أو لا توجد صلاحية لتحديثه."
        );
      }

      /*
       * ثانيًا: تحديث حالة العقد نفسه
       */
      const { error: contractUpdateError } =
        await supabase
          .from("contracts")
          .update({
            status: "Finalized",
          })
          .eq("id", contract.id);

      console.log("CONTRACT STATUS UPDATE:", {
        contractUpdateError,
      });

      if (contractUpdateError) {
        /*
         * سجل التوقيع تم اعتماده بالفعل،
         * لذلك نوضح الخطأ بدل الادعاء أن العملية كلها فشلت.
         */
        throw new Error(
          `تم اعتماد سجل التوقيع، لكن تعذر تحديث حالة العقد: ${contractUpdateError.message}`
        );
      }

      setSuccess(
        "✓ تم اعتماد العقد وتوقيعه وختمه من رامز بنجاح."
      );

      /*
       * تحديث الحالة مباشرة على الشاشة
       */
      setSigning((previous) =>
        previous
          ? {
              ...previous,
              status: "Finalized",
              approved_by: currentUser.id,
              ramz_signature: currentUser.signature,
              ramz_stamp_url: ramzStamp,
              approved_at: now,
              ramz_signed_at: now,
              ramz_stamped_at: now,
              finalized_at: now,
            }
          : previous
      );

      setContract((previous) =>
        previous
          ? {
              ...previous,
              status: "Finalized",
            }
          : previous
      );

      /*
       * إعادة تحميل البيانات من Supabase للتأكد
       */
      await loadPage();
    } catch (err: any) {
      console.error("APPROVE CONTRACT ERROR:", err);

      setError(
        err?.message ||
          "حدث خطأ أثناء اعتماد العقد."
      );
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
        <div
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-gray-50"
        >
          <div className="rounded-2xl bg-white px-8 py-6 shadow">
            جاري تحميل العقد...
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !contract) {
    return (
      <ProtectedRoute>
        <div
          dir="rtl"
          className="min-h-screen bg-gray-50 p-6"
        >
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
              <div className="mb-2 text-lg font-bold">
                تعذر تحميل العقد
              </div>

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
        </div>
      </ProtectedRoute>
    );
  }

  if (!contract || !signing || !currentUser) {
    return null;
  }

  const client = getClient(contract.clients);

  const isAdmin =
    currentUser.role.toLowerCase() === "admin";

  const isPending =
    signing.status === "Pending Ramz Approval";

  const isFinalized =
    signing.status === "Finalized";

  return (
    <ProtectedRoute>
      <main
        dir="rtl"
        className="min-h-screen bg-gray-100 p-4 md:p-6"
      >
        <div className="mx-auto max-w-6xl">

          {/* Header */}
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
                <h1 className="text-2xl font-bold text-gray-900">
                  اعتماد عقد العميل
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  مراجعة توقيع العميل واعتماد العقد من رامز الإمارات
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={printContract}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                🖨 طباعة
              </button>
            </div>
          </div>

          {/* Alerts */}
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

          {/* Status */}
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div>
                <div className="text-sm text-gray-500">
                  حالة التوقيع
                </div>

                <div className="mt-1 text-xl font-bold text-gray-900">
                  {signing.status}
                </div>
              </div>

              <div
                className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${
                  isFinalized
                    ? "bg-green-100 text-green-700"
                    : isPending
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {isFinalized
                  ? "✓ عقد نهائي"
                  : isPending
                  ? "بانتظار اعتماد رامز"
                  : signing.status}
              </div>
            </div>
          </div>

          {/* Contract data */}
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold text-gray-900">
              بيانات العقد
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <div className="text-sm text-gray-500">
                  رقم العقد
                </div>

                <div className="mt-1 font-bold">
                  {contract.contract_number || "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  اسم العقد
                </div>

                <div className="mt-1 font-bold">
                  {contract.contract_name || "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  العميل
                </div>

                <div className="mt-1 font-bold">
                  {client.client_name || "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  ممثل العميل
                </div>

                <div className="mt-1 font-bold">
                  {client.contact_person || "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  بداية العقد
                </div>

                <div className="mt-1 font-bold">
                  {formatDate(contract.start_date)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  نهاية العقد
                </div>

                <div className="mt-1 font-bold">
                  {formatDate(contract.end_date)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  قيمة العقد
                </div>

                <div className="mt-1 font-bold">
                  {contract.contract_value
                    ? `${Number(
                        contract.contract_value
                      ).toLocaleString("en-US")} ريال`
                    : "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  وصف العقد
                </div>

                <div className="mt-1 font-bold">
                  {contract.description || "-"}
                </div>
              </div>

            </div>
          </div>

          {/* Customer signing */}
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold text-gray-900">
              توقيع العميل
            </h2>

            <div className="mb-5 rounded-xl bg-gray-50 p-4">

              <div className="text-sm text-gray-500">
                اسم الموقع
              </div>

              <div className="mt-1 text-lg font-bold">
                {signing.customer_signed_by || "-"}
              </div>

              {signing.customer_signed_at && (
                <div className="mt-2 text-xs text-gray-500">
                  تاريخ التوقيع:{" "}
                  {formatDateTime(
                    signing.customer_signed_at
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">

              <div className="rounded-xl border border-gray-200 p-4">

                <div className="mb-3 text-sm font-bold text-gray-600">
                  توقيع العميل
                </div>

                <div className="flex h-48 items-center justify-center rounded-xl border bg-white">

                  {signing.customer_signature ? (
                    <img
                      src={signing.customer_signature}
                      alt="توقيع العميل"
                      className="max-h-44 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-400">
                      لا يوجد توقيع
                    </span>
                  )}

                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">

                <div className="mb-3 text-sm font-bold text-gray-600">
                  ختم العميل
                </div>

                <div className="flex h-48 items-center justify-center rounded-xl border bg-white">

                  {signing.customer_stamp_url ? (
                    <img
                      src={signing.customer_stamp_url}
                      alt="ختم العميل"
                      className="max-h-44 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-400">
                      لا يوجد ختم
                    </span>
                  )}

                </div>
              </div>

            </div>
          </div>

          {/* Ramz approval */}
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold text-gray-900">
              اعتماد رامز الإمارات
            </h2>

            {!isAdmin && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                لا تملك صلاحية اعتماد العقود. الاعتماد متاح لمدير النظام فقط.
              </div>
            )}

            {isAdmin && (
              <>

                <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">

                  <div className="font-bold text-blue-900">
                    المعتمد الحالي
                  </div>

                  <div className="mt-1 text-blue-800">
                    {currentUser.full_name}
                  </div>

                  <div className="mt-1 text-xs text-blue-700">
                    سيتم استخدام التوقيع المحفوظ في حسابك.
                  </div>

                </div>

                <div className="grid gap-6 md:grid-cols-2">

                  {/* Ramz Signature */}
                  <div>

                    <div className="mb-3 text-sm font-bold text-gray-700">
                      توقيع رامز
                    </div>

                    <div className="flex h-48 items-center justify-center rounded-xl border bg-gray-50">

                      {currentUser.signature ? (
                        <img
                          src={currentUser.signature}
                          alt="توقيع رامز"
                          className="max-h-44 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-red-500">
                          لا يوجد توقيع محفوظ
                        </span>
                      )}

                    </div>
                  </div>

                  {/* Ramz Stamp */}
                  <div>

                    <div className="mb-3 text-sm font-bold text-gray-700">
                      ختم رامز
                    </div>

                    <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">

                      {ramzStamp ? (
                        <img
                          src={ramzStamp}
                          alt="ختم رامز"
                          className="max-h-36 max-w-full object-contain"
                        />
                      ) : (
                        <>
                          <div className="text-3xl">
                            🏢
                          </div>

                          <div className="mt-2 font-bold text-gray-700">
                            اضغطي لاختيار ختم رامز
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            PNG / JPG حتى 5 MB
                          </div>
                        </>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleStampUpload}
                        className="hidden"
                      />

                    </label>
                  </div>

                </div>

                {/* Approve button */}
                {isPending && (
                  <button
                    type="button"
                    onClick={() => {
                      console.log(
                        "APPROVE BUTTON CLICKED"
                      );

                      approveContract();
                    }}
                    disabled={saving}
                    className="no-print mt-8 w-full rounded-xl bg-green-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {saving
                      ? "جاري اعتماد العقد..."
                      : "✓ اعتماد وتوقيع وختم العقد"}
                  </button>
                )}

                {isFinalized && (
                  <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5">

                    <div className="font-bold text-green-900">
                      ✓ العقد معتمد ونهائي
                    </div>

                    <div className="mt-2 text-sm text-green-800">
                      تم اعتماد العقد بتاريخ{" "}
                      {formatDateTime(
                        signing.finalized_at
                      )}
                    </div>

                  </div>
                )}

              </>
            )}
          </div>

          {/* Final signatures */}
          {(signing.ramz_signature ||
            signing.ramz_stamp_url) && (
            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

              <h2 className="mb-5 text-xl font-bold text-gray-900">
                اعتماد رامز النهائي
              </h2>

              <div className="grid gap-6 md:grid-cols-2">

                <div className="rounded-xl border p-4">

                  <div className="mb-3 text-sm font-bold text-gray-600">
                    توقيع رامز
                  </div>

                  <div className="flex h-44 items-center justify-center rounded-xl border bg-white">

                    {signing.ramz_signature ? (
                      <img
                        src={signing.ramz_signature}
                        alt="توقيع رامز"
                        className="max-h-40 max-w-full object-contain"
                      />
                    ) : (
                      "-"
                    )}

                  </div>

                  {signing.ramz_signed_at && (
                    <div className="mt-3 text-xs text-gray-500">
                      تاريخ التوقيع:{" "}
                      {formatDateTime(
                        signing.ramz_signed_at
                      )}
                    </div>
                  )}

                </div>

                <div className="rounded-xl border p-4">

                  <div className="mb-3 text-sm font-bold text-gray-600">
                    ختم رامز
                  </div>

                  <div className="flex h-44 items-center justify-center rounded-xl border bg-white">

                    {signing.ramz_stamp_url ? (
                      <img
                        src={signing.ramz_stamp_url}
                        alt="ختم رامز"
                        className="max-h-40 max-w-full object-contain"
                      />
                    ) : (
                      "-"
                    )}

                  </div>

                  {signing.ramz_stamped_at && (
                    <div className="mt-3 text-xs text-gray-500">
                      تاريخ الختم:{" "}
                      {formatDateTime(
                        signing.ramz_stamped_at
                      )}
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

        </div>

        <style jsx global>{`
          @media print {
            .no-print {
              display: none !important;
            }

            body {
              background: white !important;
            }

            main {
              padding: 0 !important;
            }

            .shadow-sm,
            .shadow {
              box-shadow: none !important;
            }
          }
        `}</style>
      </main>
    </ProtectedRoute>
  );
}