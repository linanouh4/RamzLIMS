"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import AddClientModal from "@/components/AddClientModal";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: true });

    if (!error && data) {
      setClients(data);
    }
  }

  async function deleteClient(id: number) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this client?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadClients();
  }

  function editClient(client: any) {
    setSelectedClient(client);
    setOpenModal(true);
  }

  function addNewClient() {
    setSelectedClient(null);
    setOpenModal(true);
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-100 p-8">

        <div className="flex justify-between items-center mb-8">

        <h1 className="text-3xl font-bold">
          Clients
        </h1>

        <button
          onClick={addNewClient}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold"
        >
          + Add Client
        </button>

      </div>

      <table className="w-full bg-white shadow rounded-xl overflow-hidden">

        <thead className="bg-blue-700 text-white">

          <tr>
            <th className="p-4">ID</th>
            <th className="p-4">Client Name</th>
            <th className="p-4">Phone</th>
            <th className="p-4">City</th>
            <th className="p-4">Status</th>
            <th className="p-4">Actions</th>
          </tr>

        </thead>

        <tbody>

          {clients.length === 0 ? (

            <tr>
              <td
                colSpan={6}
                className="text-center p-6 text-gray-500"
              >
                No Clients Found
              </td>
            </tr>

          ) : (

            clients.map((client) => (

              <tr
                key={client.id}
                className="border-b hover:bg-gray-50"
              >
                <td className="p-4">{client.id}</td>

                <td className="p-4 font-medium">
                  {client.client_name}
                </td>

                <td className="p-4">
                  {client.phone}
                </td>

                <td className="p-4">
                  {client.city}
                </td>

                <td className="p-4">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {client.status}
                  </span>
                </td>

                <td className="p-4">

                  <div className="flex justify-center gap-2">

                    <button
                      onClick={() => editClient(client)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => deleteClient(client.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                    >
                      🗑️
                    </button>

                  </div>

                </td>

              </tr>

            ))

          )}

        </tbody>

      </table>

      <AddClientModal
        open={openModal}
        client={selectedClient}
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