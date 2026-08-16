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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
const [technicianId, setTechnicianId] = useState("");
const [taskName, setTaskName] = useState("");
const [taskDescription, setTaskDescription] = useState("");
const [priority, setPriority] = useState("عادي");
const [testType, setTestType] = useState("");
  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);
async function saveTask() {
  if (!technicianId) {
    alert("الرجاء اختيار الفني");
    return;
  }

  if (!taskName.trim()) {
    alert("الرجاء إدخال اسم المهمة");
    return;
  }
  const { error } = await supabase.from("tasks").insert([
    {
      project_id: Number(id),
      technician_id: Number(technicianId),
      task_name: taskName,
      task_description: taskDescription,
      priority: priority,
      test_type: testType,
    },
  ]);

  if (error) {
    alert(error.message);
    return;
  }

  alert("تم إسناد المهمة بنجاح");

  setShowTaskModal(false);
  setTechnicianId("");
  setTaskName("");
  setTaskDescription("");
  setPriority("عادي");
  setTestType("");
}
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
    const { data: techData, error: techError } = await supabase
  .from("users")
  .select("id, full_name")
  .eq("role", "technician")
  .order("full_name");

if (techError) {
  alert(techError.message);
} else {
  setTechnicians(techData || []);
}
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
<div className="flex justify-end mb-4">
  <button
    onClick={() => setShowTaskModal(true)}
    className="bg-blue-700 text-white px-4 py-2 rounded-lg"
  >
    📋 إسناد مهمة
  </button>
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
     {showTaskModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-full max-w-lg">

      <h2 className="text-2xl font-bold mb-6">
        📋 إسناد مهمة لفني
      </h2>

      <div className="mb-4">
        <label className="block mb-2 font-medium">
          الفني
        </label>

        <select
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          className="w-full border rounded-lg p-3"
        >
          <option value="">اختر الفني</option>

          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.full_name}
            </option>
          ))}
        </select>
      </div>
<div className="mb-4">
  <label className="block mb-2 font-medium">
    نوع الفحص
  </label>

  <select
    value={testType}
    onChange={(e) => setTestType(e.target.value)}
    className="w-full border rounded-lg p-3"
  >
    <option value="">اختر نوع الفحص</option>
<option value="concrete-strength">
  فحص قوة عينات الخرسانة الأسمنتية
</option>
<option value="field-density">
  اختبار الكثافة الحقلية بطريقة المخروط الرملي
</option>
  </select>
</div>
      <div className="mb-4">
        <label className="block mb-2 font-medium">
          اسم المهمة
        </label>

        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          className="w-full border rounded-lg p-3"
          placeholder="مثال: أخذ عينات تربة"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium">
          وصف المهمة
        </label>

        <textarea
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          className="w-full border rounded-lg p-3"
          rows={4}
          placeholder="اكتب تفاصيل المهمة..."
        />
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium">
          الأولوية
        </label>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full border rounded-lg p-3"
        >
          <option value="منخفضة">منخفضة</option>
          <option value="عادي">عادي</option>
          <option value="عالية">عالية</option>
        </select>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowTaskModal(false)}
          className="border border-gray-300 px-5 py-2 rounded-lg"
        >
          إلغاء
        </button>

        <button
          onClick={saveTask}
          className="bg-blue-700 text-white px-5 py-2 rounded-lg"
        >
          حفظ المهمة
        </button>
      </div>

    </div>
  </div>
)}
    </ProtectedRoute>
  );
}
