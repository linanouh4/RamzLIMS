"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
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
        alert("بيانات المستخدم الحالي غير صحيحة");
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
          "تعذر تحميل بيانات المستخدم:\n" +
            (userError?.message || "المستخدم غير موجود")
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
            "مدير الفرع غير مرتبط بأي فرع."
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
          "لا يمكنك الوصول إلى هذا العميل أو أن العميل غير موجود."
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

        alert(samplesError.message);
      }

      setClient(clientData);
      setSamples(samplesData || []);
    } catch (error: any) {
      console.error(
        "CLIENT DETAILS PAGE ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء تحميل بيانات العميل:\n" +
          (error?.message || "خطأ غير معروف")
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          Loading client...
        </div>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          Client not found or access denied
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-8 min-h-screen bg-gray-100">

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
            ← Back
          </button>

          <h1 className="text-3xl font-bold text-blue-900">
            Client Details
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
                  "No address provided"}
              </p>

            </div>

            <span className="px-3 py-1 rounded-full text-sm text-white bg-green-600">
              {client.status || "Active"}
            </span>

          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                Phone
              </p>

              <p className="font-semibold">
                {client.phone || "-"}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                Email
              </p>

              <p className="font-semibold">
                {client.email || "-"}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                City
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
              Client Samples
            </h3>

            <span className="text-sm text-gray-500">
              {samples.length} total
            </span>

          </div>

          {samples.length === 0 ? (

            <p className="text-gray-500">
              No samples linked to this client yet.
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
                        `Sample #${sample.id}`}
                    </p>

                    <p className="text-sm text-gray-500">
                      {sample.sample_type ||
                        "Unknown type"}
                    </p>

                  </div>

                  <div className="text-left md:text-right">

                    <p className="text-sm font-medium">
                      {sample.status ||
                        "Pending"}
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