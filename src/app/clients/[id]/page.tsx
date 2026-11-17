"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

type CurrentUser = {
  id: number;
  role: string;
  branch_id: number | null;
};

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  const tr = (ar: string, en: string) => language === "ar" ? ar : en;

  function clientStatusLabel(value?: string | null) {
    const status = value || "Active";
    switch (status.trim().toLowerCase()) {
      case "active": return tr("نشط", "Active");
      case "inactive": return tr("غير نشط", "Inactive");
      default: return status;
    }
  }

  function sampleStatusLabel(value?: string | null) {
    const status = value || "Pending";
    return status.trim().toLowerCase() === "pending"
      ? tr("قيد الانتظار", "Pending")
      : status;
  }
  const id = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadClient();
    }
  }, [id]);

  async function loadClient() {
    setLoading(true);

    try {
      const savedUser = getSavedUser();

      if (!savedUser) {
        router.push("/");
        return;
      }

      const userId = Number(savedUser.id);

      if (!userId) {
        alert(tr("بيانات المستخدم الحالي غير صحيحة", "The current user details are invalid."));
        return;
      }

      // =========================
      // CURRENT USER
      // =========================

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("users")
        .select("id, role, branch_id")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        console.error(
          "LOAD CURRENT USER ERROR:",
          userError
        );

        alert(
          tr("تعذر تحميل بيانات المستخدم:\n", "Could not load the user details:\n") +
            (userError?.message || tr("المستخدم غير موجود", "User not found."))
        );

        return;
      }

      const current: CurrentUser = {
        id: Number(userData.id),
        role: userData.role,
        branch_id:
          userData.branch_id != null
            ? Number(userData.branch_id)
            : null,
      };

      // =========================
      // LOAD CLIENT
      // =========================

      let clientQuery = supabase
        .from("clients")
        .select("*")
        .eq("id", id);

      /*
       * Branch Manager:
       * يستطيع مشاهدة عملاء فرعه فقط.
       *
       * Admin:
       * يستطيع مشاهدة جميع العملاء.
       */

      if (current.role === "branch_manager") {
        if (!current.branch_id) {
          alert(
            tr("مدير الفرع غير مرتبط بأي فرع.", "The branch manager is not assigned to a branch.")
          );

          setClient(null);
          return;
        }

        clientQuery = clientQuery.eq(
          "branch_id",
          current.branch_id
        );
      }

      const {
        data: clientData,
        error: clientError,
      } = await clientQuery.single();

      if (clientError || !clientData) {
        console.error(
          "LOAD CLIENT ERROR:",
          clientError
        );

        setClient(null);

        alert(
          tr("لا يمكنك الوصول إلى هذا العميل أو أن العميل غير موجود.", "You cannot access this client, or the client does not exist.")
        );

        return;
      }

      // =========================
      // LOAD SAMPLES
      // =========================

      const {
        data: samplesData,
        error: samplesError,
      } = await supabase
        .from("samples")
        .select(
          "id, sample_number, sample_type, status, received_date"
        )
        .eq("client_id", id)
        .order("id", {
          ascending: false,
        });

      if (samplesError) {
        console.error(
          "LOAD CLIENT SAMPLES ERROR:",
          samplesError
        );

        alert(tr("تعذر تحميل عينات العميل.", "Could not load the client samples.") + "\n" + samplesError.message);
      }

      setClient(clientData);
      setSamples(samplesData || []);
    } catch (error: any) {
      console.error(
        "CLIENT DETAILS PAGE ERROR:",
        error
      );

      alert(
        tr("حدث خطأ أثناء تحميل بيانات العميل:\n", "Could not load the client details:\n") +
          (error?.message || tr("خطأ غير معروف", "Unknown error"))
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div dir={dir} className="p-8 text-center">
          {tr("جارٍ تحميل بيانات العميل...", "Loading client...")}
        </div>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute>
        <div dir={dir} className="p-8 text-center">
          {tr("العميل غير موجود أو ليس لديك صلاحية لعرضه.", "Client not found or access denied")}
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div dir={dir} className="p-8 min-h-screen bg-gray-100">

        <div className="flex items-center gap-3 mb-6">

          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/clients");
              }
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {tr("→ رجوع", "← Back")}
          </button>

          <h1 className="text-3xl font-bold text-blue-900">
            {tr("تفاصيل العميل", "Client Details")}
          </h1>

        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">

            <div>

              <h2 className="text-2xl font-bold">
                {client.client_name}
              </h2>

              <p className="text-gray-500 mt-2">
                {client.address ||
                  tr("العنوان غير مسجّل", "No address provided")}
              </p>

            </div>

            <span className="px-3 py-1 rounded-full text-sm text-white bg-green-600">
              {clientStatusLabel(client.status)}
            </span>

          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                {tr("الهاتف", "Phone")}
              </p>

              <p className="font-semibold">
                {client.phone || "-"}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                {tr("البريد الإلكتروني", "Email")}
              </p>

              <p className="font-semibold">
                {client.email || "-"}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                {tr("المدينة", "City")}
              </p>

              <p className="font-semibold">
                {client.city || "-"}
              </p>
            </div>

          </div>

        </div>

        <div className="bg-white rounded-xl shadow p-6">

          <div className="flex items-center justify-between mb-4">

            <h3 className="text-xl font-bold">
              {tr("عينات العميل", "Client Samples")}
            </h3>

            <span className="text-sm text-gray-500">
              {tr("إجمالي العينات", "Total samples")}: {samples.length}
            </span>

          </div>

          {samples.length === 0 ? (

            <p className="text-gray-500">
              {tr("لا توجد عينات مرتبطة بهذا العميل حتى الآن.", "No samples linked to this client yet.")}
            </p>

          ) : (

            <div className="space-y-3">

              {samples.map((sample) => (

                <div
                  key={sample.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                >

                  <div>

                    <p className="font-semibold">
                      {sample.sample_number ||
                        `${tr("عينة رقم", "Sample #")} ${sample.id}`}
                    </p>

                    <p className="text-sm text-gray-500">
                      {sample.sample_type ||
                        tr("نوع العينة غير محدد", "Unknown type")}
                    </p>

                  </div>

                  <div className="text-start md:text-end">

                    <p className="text-sm font-medium">
                      {sampleStatusLabel(sample.status)}
                    </p>

                    <p className="text-xs text-gray-400">
                      {sample.received_date ||
                        "-"}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>
    </ProtectedRoute>
  );
}