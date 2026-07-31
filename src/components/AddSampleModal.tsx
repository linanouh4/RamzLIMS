"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  open: boolean;
  sample?: any;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddSampleModal({
  open,
  sample,
  onClose,
  onSaved,
}: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState("");

  const [sampleType, setSampleType] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("project_name");

    setProjects(data || []);
  }

  useEffect(() => {
    if (sample) {
      setProjectId(sample.project_id?.toString() || "");
      setSampleType(sample.sample_type || "");
      setReceivedDate(sample.received_date || "");
      setReceivedBy(sample.received_by || "");
      setStatus(sample.status || "Pending");
      setNotes(sample.notes || "");
    } else {
      setProjectId("");
      setSampleType("");
      setReceivedDate("");
      setReceivedBy("");
      setStatus("Pending");
      setNotes("");
    }
  }, [sample, open]);

  if (!open) return null;

  async function saveSample() {
    setLoading(true);

    let error;

    const payload = {
      project_id: Number(projectId),
      sample_type: sampleType,
      received_date: receivedDate,
      received_by: receivedBy,
      status,
      notes,
    };

    if (sample) {
      ({ error } = await supabase
        .from("samples")
        .update(payload)
        .eq("id", sample.id));
    } else {
      ({ error } = await supabase
        .from("samples")
        .insert([payload]));
    }

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    onSaved();
    onClose();
  }
    return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[600px] p-8">

        <h2 className="text-2xl font-bold mb-6">
          {sample ? "Edit Sample" : "Add Sample"}
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <select
            className="border rounded-lg p-3 col-span-2"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">
              Select Project
            </option>

            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.project_name}
              </option>
            ))}
          </select>

          <input
            className="border rounded-lg p-3"
            placeholder="Sample Type"
            value={sampleType}
            onChange={(e) => setSampleType(e.target.value)}
          />

          <input
            type="date"
            className="border rounded-lg p-3"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />

          <input
            className="border rounded-lg p-3"
            placeholder="Received By"
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
          />

          <select
            className="border rounded-lg p-3"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Approved</option>
          </select>

          <textarea
            className="border rounded-lg p-3 col-span-2"
            placeholder="Notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

        </div>

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border"
          >
            Cancel
          </button>

          <button
            onClick={saveSample}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
          >
            {loading ? "Saving..." : "Save"}
          </button>

        </div>

      </div>
    </div>
  );
}
