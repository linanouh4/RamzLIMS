"use client";

import BackButton from "@/components/BackButton";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import AddClientModal from "@/components/AddClientModal";
import { getSavedUser } from "@/lib/auth";

type CurrentUser = {
  id: number;
  role: string;
  branch_id: number | null;
};

export default function ClientsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const tr = (ar: string, en: string) => language === "ar" ? ar : en;

  const [clients, setClients] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);

  const currentRole = currentUser?.role?.trim().toLowerCase();
  const canEdit = Boolean(currentRole) && currentRole !== "technical_manager";
  const canDelete = Boolean(currentRole) && currentRole !== "technical_manager";

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
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

      /*
       * تحميل بيانات المستخدم الحالية
       */
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
            (userError?.message ||
              tr("المستخدم غير موجود", "User not found."))
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

      setCurrentUser(current);

      /*
       * تحميل العملاء
       */
      let query = supabase
        .from("clients")
        .select("*")
        .order("id", {
          ascending: true,
        });

      /*
       * مدير الفرع:
       * يشاهد عملاء فرعه فقط.
       *
       * Admin:
       * يشاهد جميع العملاء.
       */
      if (
        current.role === "branch_manager"
      ) {
        if (!current.branch_id) {
          alert(
            tr("مدير الفرع غير مرتبط بأي فرع.", "The branch manager is not assigned to a branch.")
          );

          setClients([]);
          return;
        }

        query = query.eq(
          "branch_id",
          current.branch_id
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.error(
          "LOAD CLIENTS ERROR:",
          error
        );

        alert(error.message);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error(
        "CLIENTS PAGE ERROR:",
        error
      );

      alert(
        tr("حدث خطأ أثناء تحميل العملاء", "Could not load clients.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient(id: number) {
    if (!currentUser) {
      alert(
        tr("لم يتم التعرف على المستخدم الحالي", "Could not identify the current user.")
      );
      return;
    }

    if (currentUser.role?.trim().toLowerCase() === "technical_manager") {
      alert(tr("المدير الفني غير مخوّل بحذف العملاء.", "The technical manager cannot delete clients."));
      return;
    }

    const client = clients.find(
      (item) => Number(item.id) === id
    );

    if (!client) {
      alert(tr("العميل غير موجود", "Client not found."));
      return;
    }

    /*
     * حماية إضافية:
     * مدير الفرع لا يستطيع حذف عميل تابع لفرع آخر.
     */
    if (
      currentUser.role ===
        "branch_manager" &&
      Number(client.branch_id) !==
        Number(currentUser.branch_id)
    ) {
      alert(
        tr("لا يمكنك حذف عميل تابع لفرع آخر.", "You cannot delete a client from another branch.")
      );
      return;
    }

    const confirmDelete = confirm(
      tr("هل تريد حذف هذا العميل؟", "Are you sure you want to delete this client?")
    );

    if (!confirmDelete) return;

    let query = supabase
      .from("clients")
      .delete()
      .eq("id", id);

    /*
     * مدير الفرع يحذف فقط من فرعه.
     */
    if (
      currentUser.role ===
        "branch_manager"
    ) {
      query = query.eq(
        "branch_id",
        currentUser.branch_id
      );
    }

    const { error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    await loadClients();
  }

  function editClient(client: any) {
    if (!currentUser || !currentRole) {
      alert(tr("لم يتم التعرف على المستخدم الحالي", "Could not identify the current user."));
      return;
    }

    if (currentRole === "technical_manager") {
      alert(tr("المدير الفني غير مخوّل بتعديل العملاء.", "The technical manager cannot edit clients."));
      return;
    }

    /*
     * حماية إضافية لمدير الفرع
     */
    if (
      currentUser?.role ===
        "branch_manager" &&
      Number(client.branch_id) !==
        Number(currentUser.branch_id)
    ) {
      alert(
        tr("لا يمكنك تعديل عميل تابع لفرع آخر.", "You cannot edit a client from another branch.")
      );
      return;
    }

    setSelectedClient(client);
    setOpenModal(true);
  }

  function addNewClient() {
    setSelectedClient(null);
    setOpenModal(true);
  }

  function statusLabel(value?: string | null) {
    const status = value || "Active";
    switch (status.trim().toLowerCase()) {
      case "active": return tr("نشط", "Active");
      case "inactive": return tr("غير نشط", "Inactive");
      default: return status;
    }
  }

  const filteredClients = clients.filter(
    (client) => {
      const search =
        searchTerm.toLowerCase();

      const status = (
        client.status || "Active"
      ).toLowerCase();

      const matchesSearch =
        !search ||
        [
          client.client_name,
          client.phone,
          client.city,
          client.email,
          client.contact_person,
          client.company_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        status ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );

  const activeClients =
    clients.filter(
      (client) =>
        (client.status || "Active") ===
        "Active"
    ).length;

  return (
    <ProtectedRoute>
      <main dir={language === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-gray-100 p-8">

        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">

          <div className="flex items-center gap-3">

            <BackButton onClick={() => {
                if (
                  window.history.length > 1
                ) {
                  router.back();
                } else {
                  router.push(
                    "/dashboard"
                  );
                }
              }} />

            <div>
              <h1 className="text-3xl font-bold">
                {language === "ar" ? "العملاء" : "Clients"}
              </h1>

              <p className="text-gray-500 mt-1">
                {currentUser?.role === "branch_manager"
  ? (language === "ar" ? "إدارة عملاء فرعك." : "Manage clients for your branch.")
  : (language === "ar" ? "إدارة قائمة العملاء واستعراض عيناتهم." : "Manage your client list and quickly view their samples.")}
              </p>
            </div>

          </div>

          <button
            onClick={addNewClient}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold"
          >
            {language === "ar" ? "+ إضافة عميل" : "+ Add Client"}
          </button>

        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              {language === "ar" ? "إجمالي العملاء" : "Total Clients"}
            </p>

            <p className="text-2xl font-bold">
              {clients.length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              {language === "ar" ? "العملاء النشطون" : "Active Clients"}
            </p>

            <p className="text-2xl font-bold">
              {activeClients}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              {language === "ar" ? "نتائج التصفية" : "Filtered Results"}
            </p>

            <p className="text-2xl font-bold">
              {filteredClients.length}
            </p>
          </div>

        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <input
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            placeholder={tr("ابحث بالاسم أو الهاتف أو المدينة أو البريد الإلكتروني", "Search by name, phone, city, or email")}
            className="w-full md:max-w-md border rounded-lg p-3"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className="border rounded-lg p-3"
          >
            <option value="All">
              {language === "ar" ? "كل الحالات" : "All Statuses"}
            </option>

            <option value="Active">
              {tr("نشط", "Active")}
            </option>

            <option value="Inactive">
              {tr("غير نشط", "Inactive")}
            </option>
          </select>

        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-xl bg-white shadow">

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              {language === "ar" ? "جارٍ تحميل العملاء..." : "Loading clients..."}
            </div>
          ) : (
            <table className="w-full">

              <thead className="bg-blue-700 text-white">

                <tr>
                  <th className="p-4 text-start">
                    {language === "ar" ? "المعرّف" : "ID"}
                  </th>

                  <th className="p-4 text-start">
                    {language === "ar" ? "اسم العميل" : "Client Name"}
                  </th>

                  <th className="p-4 text-start">
                    {language === "ar" ? "الهاتف" : "Phone"}
                  </th>

                  <th className="p-4 text-start">
                    {language === "ar" ? "المدينة" : "City"}
                  </th>

                  <th className="p-4 text-start">
                    {language === "ar" ? "الشخص المسؤول" : "Contact Person"}
                  </th>

                  <th className="p-4 text-start">
                    {language === "ar" ? "نوع الشركة" : "Company Type"}
                  </th>

                  <th className="p-4 text-start">
                    {language === "ar" ? "الحالة" : "Status"}
                  </th>

                  <th className="p-4 text-start">
                    {language === "ar" ? "الإجراءات" : "Actions"}
                  </th>
                </tr>

              </thead>

              <tbody>

                {filteredClients.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center p-6 text-gray-500"
                    >
                      {language === "ar" ? "لا يوجد عملاء يطابقون معايير التصفية." : "No clients found for the selected criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(
                    (client) => (
                      <tr
                        key={client.id}
                        className="border-b hover:bg-gray-50"
                      >

                        <td className="p-4">
                          {client.id}
                        </td>

                        <td className="p-4 font-medium">
                          {client.client_name}
                        </td>

                        <td className="p-4">
                          {client.phone || "-"}
                        </td>

                        <td className="p-4">
                          {client.city || "-"}
                        </td>

                        <td className="p-4">
                          {client.contact_person ||
                            "-"}
                        </td>

                        <td className="p-4">
                          {client.company_type ||
                            "-"}
                        </td>

                        <td className="p-4">
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                            {statusLabel(client.status)}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">

                            <button
                              onClick={() =>
                                router.push(
                                  `/clients/${client.id}`
                                )
                              }
                              className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg"
                            >
                              {language === "ar" ? "فتح" : "Open"}
                            </button>

                            {canEdit && (
                            <button
                              onClick={() =>
                                editClient(
                                  client
                                )
                              }
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                            >
                              {language === "ar" ? "تعديل" : "Edit"}
                            </button>
                            )}

                            {canDelete && (
                            <button
                              onClick={() =>
                                deleteClient(
                                  Number(
                                    client.id
                                  )
                                )
                              }
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                            >
                              {language === "ar" ? "حذف" : "Delete"}
                            </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>
          )}

        </div>

        {/* ADD / EDIT CLIENT */}
        <AddClientModal
          open={openModal}
          client={selectedClient}
          branchId={
            currentUser?.branch_id ??
            null
          }
          onClose={() => {
            setOpenModal(false);
            setSelectedClient(null);
          }}
          onSaved={loadClients}
        />

      </main>
    </ProtectedRoute>
  );
}
