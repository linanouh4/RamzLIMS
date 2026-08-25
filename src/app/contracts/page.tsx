"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSavedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type ContractClient = {
  client_name: string | null;
  phone: string | null;
  city: string | null;
  contact_person: string | null;
};

type Contract = {
  id: number;
  contract_number: string | null;
  contract_name: string | null;
  client_id: number | null;
  branch_id: number | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
  clients: ContractClient[] | null;
};

export default function ContractsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedUser = getSavedUser();

    if (!savedUser) {
      router.push("/");
      return;
    }

    setUser(savedUser);
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadContracts = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("contracts")
        .select(`
          id,
          contract_number,
          contract_name,
          client_id,
          branch_id,
          start_date,
          end_date,
          contract_value,
          status,
          description,
          created_at,
          clients (
            client_name,
            phone,
            city,
            contact_person
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("CONTRACTS ERROR:", error);
        setError(error.message);
        setContracts([]);
      } else {
        setContracts((data as Contract[]) || []);
      }

      setLoading(false);
    };

    loadContracts();
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        جاري التحميل...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex items-center justify-between mb-8">

          <div>

            <h1 className="text-3xl font-bold text-slate-800">
              العقود
            </h1>

            <p className="text-gray-500 mt-2">
              إدارة ومتابعة جميع عقود العملاء
            </p>

          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-3 rounded-lg hover:bg-gray-50 shadow-sm"
          >
            ← رجوع
          </button>

        </div>

        {/* ERROR */}

        {error && (

          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-5">

            <div className="font-semibold mb-1">
              تعذر تحميل العقود
            </div>

            <div className="text-sm">
              {error}
            </div>

          </div>

        )}

        {/* LOADING */}

        {loading && (

          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
            جاري تحميل العقود...
          </div>

        )}

        {/* EMPTY */}

        {!loading && !error && contracts.length === 0 && (

          <div className="bg-white rounded-xl shadow p-12 text-center">

            <div className="text-5xl mb-4">
              📄
            </div>

            <h2 className="text-xl font-bold text-gray-700">
              لا توجد عقود
            </h2>

            <p className="text-gray-500 mt-2">
              لم يتم تسجيل أي عقود حتى الآن.
            </p>

          </div>

        )}

        {/* CONTRACTS */}

        {!loading && contracts.length > 0 && (

          <div className="space-y-6">

            {/* COUNT */}

            <div className="bg-white rounded-xl shadow p-5">

              <div className="text-gray-500 text-sm">
                إجمالي العقود
              </div>

              <div className="text-3xl font-bold text-blue-700 mt-1">
                {contracts.length}
              </div>

            </div>

            {contracts.map((contract) => {

              const client = Array.isArray(contract.clients)
                ? contract.clients[0]
                : null;

              return (

                <div
                  key={contract.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                >

                  {/* CONTRACT HEADER */}

                  <div className="bg-slate-800 text-white p-6">

                    <div className="flex items-center justify-between gap-4">

                      <div>

                        <div className="text-sm text-slate-300 mb-1">
                          رقم العقد
                        </div>

                        <div className="text-2xl font-bold">
                          {contract.contract_number || "بدون رقم"}
                        </div>

                      </div>

                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          contract.status?.toLowerCase() === "active"
                            ? "bg-green-500 text-white"
                            : contract.status?.toLowerCase() === "completed"
                            ? "bg-blue-500 text-white"
                            : "bg-white/20 text-white"
                        }`}
                      >
                        {contract.status || "غير محدد"}
                      </span>

                    </div>

                  </div>

                  {/* CONTRACT CONTENT */}

                  <div className="p-6">

                    {/* BASIC INFO */}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                      {/* CONTRACT NAME */}

                      <div>

                        <div className="text-sm text-gray-500">
                          اسم العقد
                        </div>

                        <div className="font-semibold text-gray-800 mt-1">
                          {contract.contract_name || "-"}
                        </div>

                      </div>

                      {/* CLIENT */}

                      <div>

                        <div className="text-sm text-gray-500">
                          العميل
                        </div>

                        <div className="font-semibold text-gray-800 mt-1">
                          {client?.client_name || "-"}
                        </div>

                      </div>

                      {/* CONTACT PERSON */}

                      <div>

                        <div className="text-sm text-gray-500">
                          جهة الاتصال
                        </div>

                        <div className="font-semibold text-gray-800 mt-1">
                          {client?.contact_person || "-"}
                        </div>

                      </div>

                      {/* PHONE */}

                      <div>

                        <div className="text-sm text-gray-500">
                          هاتف العميل
                        </div>

                        <div className="font-semibold text-gray-800 mt-1">
                          {client?.phone || "-"}
                        </div>

                      </div>

                      {/* CITY */}

                      <div>

                        <div className="text-sm text-gray-500">
                          المدينة
                        </div>

                        <div className="font-semibold text-gray-800 mt-1">
                          {client?.city || "-"}
                        </div>

                      </div>

                      {/* CONTRACT VALUE */}

                      <div>

                        <div className="text-sm text-gray-500">
                          قيمة العقد
                        </div>

                        <div className="font-bold text-blue-700 text-lg mt-1">

                          {contract.contract_value !== null
                            ? `${Number(
                                contract.contract_value
                              ).toLocaleString("ar-SA")} ريال`
                            : "-"}

                        </div>

                      </div>

                      {/* START DATE */}

                      <div>

                        <div className="text-sm text-gray-500">
                          تاريخ بداية العقد
                        </div>

                        <div className="font-semibold text-gray-800 mt-1">
                          {contract.start_date || "-"}
                        </div>

                      </div>

                      {/* END DATE */}

                      <div>

                        <div className="text-sm text-gray-500">
                          تاريخ نهاية العقد
                        </div>

                        <div className="font-semibold text-gray-800 mt-1">
                          {contract.end_date || "-"}
                        </div>

                      </div>

                      {/* CLIENT ID */}

                      <div>

                        <div className="text-sm text-gray-500">
                          رقم العميل
                        </div>

                        <div className="font-semibold text-gray-800 mt-1">
                          {contract.client_id || "-"}
                        </div>

                      </div>

                    </div>

                    {/* DESCRIPTION */}

                    <div className="mt-7 pt-6 border-t border-gray-200">

                      <div className="text-sm text-gray-500 mb-2">
                        وصف العقد
                      </div>

                      <div className="bg-slate-50 rounded-xl p-5 text-gray-700 leading-7">
                        {contract.description ||
                          "لا يوجد وصف للعقد."}
                      </div>

                    </div>

                    {/* FOOTER */}

                    <div className="mt-6 pt-5 border-t border-gray-200 flex flex-wrap gap-6 text-sm text-gray-500">

                      <div>
                        رقم السجل:

                        <span className="font-semibold text-gray-700 mr-2">
                          {contract.id}
                        </span>

                      </div>

                      <div>
                        تاريخ الإنشاء:

                        <span className="font-semibold text-gray-700 mr-2">

                          {contract.created_at
                            ? new Date(
                                contract.created_at
                              ).toLocaleDateString("ar-SA")
                            : "-"}

                        </span>

                      </div>

                      <div>
                        الفرع:

                        <span className="font-semibold text-gray-700 mr-2">
                          {contract.branch_id || "-"}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </div>
    </main>
  );
}