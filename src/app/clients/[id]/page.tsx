"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

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

    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (clientError) {
      alert(clientError.message);
      setLoading(false);
      return;
    }

    const { data: samplesData, error: samplesError } = await supabase
      .from("samples")
      .select("id, sample_number, sample_type, status, received_date")
      .eq("client_id", id)
      .order("id", { ascending: false });

    if (samplesError) {
      alert(samplesError.message);
    }

    setClient(clientData);
    setSamples(samplesData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">Loading client...</div>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">Client not found</div>
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
          <h1 className="text-3xl font-bold text-blue-900">Client Details</h1>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
            <div>
              <h2 className="text-2xl font-bold">{client.client_name}</h2>
              <p className="text-gray-500 mt-2">{client.address || "No address provided"}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm text-white bg-green-600">
              {client.status || "Active"}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-semibold">{client.phone || "-"}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-semibold">{client.email || "-"}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">City</p>
              <p className="font-semibold">{client.city || "-"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Client Samples</h3>
            <span className="text-sm text-gray-500">{samples.length} total</span>
          </div>

          {samples.length === 0 ? (
            <p className="text-gray-500">No samples linked to this client yet.</p>
          ) : (
            <div className="space-y-3">
              {samples.map((sample) => (
                <div key={sample.id} className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{sample.sample_number || `Sample #${sample.id}`}</p>
                    <p className="text-sm text-gray-500">{sample.sample_type || "Unknown type"}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm font-medium">{sample.status || "Pending"}</p>
                    <p className="text-xs text-gray-400">{sample.received_date || "-"}</p>
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
