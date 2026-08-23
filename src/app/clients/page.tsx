"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
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

  const [clients, setClients] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);

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
        alert("بيانات المستخدم الحالي غير صحيحة");
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
          "تعذر تحميل بيانات المستخدم:\n" +
            (userError?.message ||
              "المستخدم غير موجود")
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
            "مدير الفرع غير مرتبط بأي فرع."
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
        "حدث خطأ أثناء تحميل العملاء"
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient(id: number) {
    if (!currentUser) {
      alert(
        "لم يتم التعرف على المستخدم الحالي"
      );
      return;
    }

    const client = clients.find(
      (item) => Number(item.id) === id
    );

    if (!client) {
      alert("العميل غير موجود");
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
        "لا يمكنك حذف عميل تابع لفرع آخر."
      );
      return;
    }

    const confirmDelete = confirm(
      "Are you sure you want to delete this client?"
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
        "لا يمكنك تعديل عميل تابع لفرع آخر."
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
      <main className="min-h-screen bg-gray-100 p-8">

        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">

          <div className="flex items-center gap-3">

            <button
              onClick={() => {
                if (
                  window.history.length > 1
                ) {
                  router.back();
                } else {
                  router.push(
                    "/dashboard"
                  );
                }
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </button>

            <div>
              <h1 className="text-3xl font-bold">
                Clients
              </h1>

              <p className="text-gray-500 mt-1">
                {currentUser?.role ===
                "branch_manager"
                  ? "Manage clients for your branch."
                  : "Manage your client list and quickly view their samples."}
              </p>
            </div>

          </div>

          <button
            onClick={addNewClient}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold"
          >
            + Add Client
          </button>

        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Total Clients
            </p>

            <p className="text-2xl font-bold">
              {clients.length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Active Clients
            </p>

            <p className="text-2xl font-bold">
              {activeClients}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Filtered Results
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
            placeholder="Search by name, phone, city, or email"
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
              All Statuses
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive
            </option>
          </select>

        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-xl bg-white shadow">

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading clients...
            </div>
          ) : (
            <table className="w-full">

              <thead className="bg-blue-700 text-white">

                <tr>
                  <th className="p-4 text-left">
                    ID
                  </th>

                  <th className="p-4 text-left">
                    Client Name
                  </th>

                  <th className="p-4 text-left">
                    Phone
                  </th>

                  <th className="p-4 text-left">
                    City
                  </th>

                  <th className="p-4 text-left">
                    Contact Person
                  </th>

                  <th className="p-4 text-left">
                    Company Type
                  </th>

                  <th className="p-4 text-left">
                    Status
                  </th>

                  <th className="p-4 text-left">
                    Actions
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
                      No clients found for
                      the selected criteria.
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
                            {client.status ||
                              "Active"}
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
                              Open
                            </button>

                            <button
                              onClick={() =>
                                editClient(
                                  client
                                )
                              }
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                            >
                              Edit
                            </button>

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
                              Delete
                            </button>

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