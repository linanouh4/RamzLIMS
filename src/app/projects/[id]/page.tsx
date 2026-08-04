"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  async function loadProject() {
    setLoading(true);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError) {
      alert(projectError.message);
      setLoading(false);
      return;
    }

    const { data: samplesData, error: samplesError } = await supabase
      .from("samples")
      .select("id, sample_number, sample_type, status, received_date")
      .eq("project_id", id)
      .order("id", { ascending: false });

    if (samplesError) {
      alert(samplesError.message);
    }

    setProject(projectData);
    setSamples(samplesData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">Loading project...</div>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">Project not found</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-8 min-h-screen bg-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-blue-900">Project Details</h1>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{project.project_name}</h2>
              <p className="text-gray-500 mt-2">{project.description || "No description provided"}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm text-white bg-green-600">
              {project.project_status}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Project Number</p>
              <p className="font-semibold">{project.project_number || "-"}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-semibold">{project.location || "-"}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Samples Count</p>
              <p className="font-semibold">{samples.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold mb-4">Associated Samples</h3>

          {samples.length === 0 ? (
            <p className="text-gray-500">No samples linked to this project yet.</p>
          ) : (
            <div className="space-y-3">
              {samples.map((sample) => (
                <div key={sample.id} className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <p className="font-semibold">{sample.sample_number || `Sample #${sample.id}`}</p>
                    <p className="text-sm text-gray-500">{sample.sample_type || "Unknown type"}</p>
                  </div>
                  <div className="text-right">
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
