"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import AddSampleModal from "@/components/AddSampleModal";

export default function SamplesPage() {
  const router = useRouter();

  const [samples, setSamples] = useState<any[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);

  useEffect(() => {
    loadSamples();
  }, []);

  useEffect(() => {
    let data = [...samples];

    if (search) {
      const value = search.toLowerCase();
      data = data.filter(
        (sample) =>
          sample.project_name?.toLowerCase().includes(value) ||
          sample.client_name?.toLowerCase().includes(value) ||
          sample.sample_type?.toLowerCase().includes(value) ||
          sample.received_by?.toLowerCase().includes(value)
      );
    }

    if (statusFilter !== "All") {
      data = data.filter((sample) => sample.status === statusFilter);
    }

    setFilteredSamples(data);
  }, [search, statusFilter, samples]);

  async function loadSamples() {
    setLoading(true);

    const { data, error } = await supabase
      .from("samples")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setSamples(data || []);
    setFilteredSamples(data || []);
    setLoading(false);
  }

  function openAddModal() {
    setSelectedSample(null);
    setOpenModal(true);
  }

  function openEditModal(sample: any) {
    setSelectedSample(sample);
    setOpenModal(true);
  }

  async function deleteSample(id: number) {
    const confirmDelete = confirm("Are you sure you want to delete this sample?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("samples").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadSamples();
  }

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="flex flex-col gap-6 mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/dashboard");
                }
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold">Samples</h1>
          </div>

          <button
            onClick={openAddModal}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg"
          >
            + Add Sample
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center">
          <input
            type="text"
            placeholder="Search samples..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded-lg p-3"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-4 py-3"
          >
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">Loading samples...</div>
          ) : filteredSamples.length === 0 ? (
            <div className="p-6 text-center">No samples found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-left">Client</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Received Date</th>
                  <th className="p-3 text-left">Received By</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSamples.map((sample) => (
                  <tr key={sample.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{sample.project_name}</td>
                    <td className="p-3">{sample.client_name}</td>
                    <td className="p-3">{sample.sample_type}</td>
                    <td className="p-3">{sample.received_date}</td>
                    <td className="p-3">{sample.received_by}</td>
                    <td className="p-3">{sample.status}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/samples/${sample.id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openEditModal(sample)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSample(sample.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <AddSampleModal
          open={openModal}
          sample={selectedSample}
          onClose={() => {
            setOpenModal(false);
            setSelectedSample(null);
          }}
          onSaved={() => {
            loadSamples();
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
