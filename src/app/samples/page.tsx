"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AddSampleModal from "@/components/AddSampleModal";

export default function SamplesPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);

  useEffect(() => {
    loadSamples();
  }, []);

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
    const confirmDelete = confirm(
      "Are you sure you want to delete this sample?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("samples")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadSamples();
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          Samples
        </h1>

        <button
          onClick={openAddModal}
          className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg"
        >
          + Add Sample
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            Loading samples...
          </div>
        ) : samples.length === 0 ? (
          <div className="p-6 text-center">
            No samples found
          </div>
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
              {samples.map((sample) => (
                <tr
                  key={sample.id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="p-3">{sample.project_name}</td>
                  <td className="p-3">{sample.client_name}</td>
                  <td className="p-3">{sample.sample_type}</td>
                  <td className="p-3">{sample.received_date}</td>
                  <td className="p-3">{sample.received_by}</td>
                  <td className="p-3">{sample.status}</td>

                  <td className="p-3">
                    <div className="flex gap-2">
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
  );
}
