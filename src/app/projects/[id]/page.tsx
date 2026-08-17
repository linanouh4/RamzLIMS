"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);

  const [technicianId, setTechnicianId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState("عادي");
  const [testType, setTestType] = useState("");

  const [deletingTasks, setDeletingTasks] = useState(false);

  const currentUser = getSavedUser();
  const isAdmin = currentUser?.role === "admin";

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

    if (!testType) {
      alert("الرجاء اختيار نوع الفحص");
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

        // المهمة الجديدة تعتبر تجريبية أثناء مرحلة الاختبار
        is_test: true,
      },
    ]);

    if (error) {
      console.error("SAVE TASK ERROR:", error);
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

    await loadTasks();
  }

  async function loadProject() {
    setLoading(true);

    const { data: projectData, error: projectError } =
      await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

    if (projectError) {
      console.error("PROJECT ERROR:", projectError);
      alert(projectError.message);
      setLoading(false);
      return;
    }

    const { data: samplesData, error: samplesError } =
      await supabase
        .from("samples")
        .select(
          "id, sample_number, sample_type, status, received_date"
        )
        .eq("project_id", id)
        .order("id", { ascending: false });

    if (samplesError) {
      console.error("SAMPLES ERROR:", samplesError);
      alert(samplesError.message);
    }

    setProject(projectData);
    setSamples(samplesData || []);

    await loadTasks();

    const { data: techData, error: techError } =
      await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "technician")
        .order("full_name");

    if (techError) {
      console.error("TECHNICIANS ERROR:", techError);
      alert(techError.message);
    } else {
      setTechnicians(techData || []);
    }

    setLoading(false);
  }

  async function loadTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
          id,
          project_id,
          technician_id,
          task_name,
          task_description,
          priority,
          status,
          test_type,
          is_test,
          users:technician_id (
            id,
            full_name,
            username
          )
        `
      )
      .eq("project_id", Number(id))
      .order("id", { ascending: false });

    if (error) {
      console.error("TASKS ERROR:", error);
      alert(error.message);
      return;
    }

    setTasks(data || []);
  }

  async function deleteTestTasks() {
    if (!isAdmin) {
      alert("ليس لديك صلاحية حذف المهام التجريبية.");
      return;
    }

    const testTasks = tasks.filter(
      (task) => task.is_test === true
    );

    if (testTasks.length === 0) {
      alert("لا توجد مهام تجريبية لحذفها.");
      return;
    }

    const confirmed = window.confirm(
      `سيتم حذف ${testTasks.length} مهمة تجريبية نهائيًا.\n\nهل أنت متأكد؟`
    );

    if (!confirmed) {
      return;
    }

    setDeletingTasks(true);

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("project_id", Number(id))
        .eq("is_test", true);

      if (error) {
        console.error("DELETE TEST TASKS ERROR:", error);
        alert(
          "حدث خطأ أثناء حذف المهام:\n" +
            error.message
        );
        return;
      }

      alert("تم حذف جميع المهام التجريبية بنجاح.");

      await loadTasks();
    } catch (error: any) {
      console.error("UNEXPECTED DELETE ERROR:", error);

      alert(
        "حدث خطأ غير متوقع:\n" +
          (error?.message || "خطأ غير معروف")
      );
    } finally {
      setDeletingTasks(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          Loading project...
        </div>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          Project not found
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-8 min-h-screen bg-gray-100">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-bold text-blue-900">
            Project Details
          </h1>
        </div>

        {/* PROJECT INFORMATION */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <div className="flex justify-between items-start">

            <div>
              <h2 className="text-2xl font-bold">
                {project.project_name}
              </h2>

              <p className="text-gray-500 mt-2">
                {project.description ||
                  "No description provided"}
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-sm text-white bg-green-600">
              {project.project_status}
            </span>

          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                Project Number
              </p>

              <p className="font-semibold">
                {project.project_number || "-"}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                Location
              </p>

              <p className="font-semibold">
                {project.location || "-"}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">
                Samples Count
              </p>

              <p className="font-semibold">
                {samples.length}
              </p>
            </div>

          </div>
        </div>

        {/* TASK BUTTONS */}
        <div className="flex justify-end gap-3 mb-4">

          <button
            onClick={() => setShowTaskModal(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg"
          >
            📋 إسناد مهمة
          </button>

          {isAdmin && (
            <button
              onClick={deleteTestTasks}
              disabled={deletingTasks}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              {deletingTasks
                ? "جاري الحذف..."
                : "🗑️ حذف المهام التجريبية"}
            </button>
          )}

        </div>

        {/* TASKS */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <div className="flex justify-between items-center mb-4">

            <h3 className="text-xl font-bold">
              المهام المسندة
            </h3>

            <span className="text-sm text-gray-500">
              عدد المهام: {tasks.length}
            </span>

          </div>

          {tasks.length === 0 ? (

            <p className="text-gray-500">
              لا توجد مهام مسندة لهذا المشروع.
            </p>

          ) : (

            <div className="space-y-3">

              {tasks.map((task) => {

                const technician = Array.isArray(task.users)
                  ? task.users[0]
                  : task.users;

                return (
                  <div
                    key={task.id}
                    className={`border rounded-lg p-4 ${
                      task.is_test
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200"
                    }`}
                  >

                    <div className="flex justify-between items-start gap-4">

                      <div>

                        <div className="flex items-center gap-2">

                          <p className="font-bold text-lg">
                            {task.task_name}
                          </p>

                          {task.is_test && (
                            <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
                              تجريبية
                            </span>
                          )}

                        </div>
{isAdmin && task.is_test === true && (
  <button
    onClick={async () => {
      const confirmed = window.confirm(
        `هل أنت متأكد من حذف المهمة رقم ${task.id}؟`
      );

      if (!confirmed) return;

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id)
        .eq("is_test", true);

      if (error) {
        console.error("DELETE TASK ERROR:", error);
        alert("خطأ في حذف المهمة:\n" + error.message);
        return;
      }

      alert("تم حذف المهمة بنجاح");

      setTasks((prev) =>
        prev.filter((item) => item.id !== task.id)
      );
    }}
    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
  >
    🗑️ حذف المهمة
  </button>
)}
                        <p className="text-sm text-gray-600 mt-1">
                          {task.task_description ||
                            "لا يوجد وصف"}
                        </p>

                        <div className="mt-2 text-sm space-y-1">

                          <p>
                            👨‍🔬 الفني:{" "}
                            <span className="font-semibold">
                              {technician?.full_name ||
                                technician?.username ||
                                "غير محدد"}
                            </span>
                          </p>

                          <p>
                            🧪 نوع الفحص:{" "}
                            {task.test_type || "-"}
                          </p>

                          <p>
                            الأولوية:{" "}
                            {task.priority || "عادي"}
                          </p>

                          <p>
                            الحالة:{" "}
                            {task.status ||
                              "بانتظار البدء"}
                          </p>

                          <p className="text-xs text-gray-400">
                            رقم المهمة: {task.id}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>

        {/* SAMPLES */}
        <div className="bg-white rounded-xl shadow p-6">

          <h3 className="text-xl font-bold mb-4">
            Associated Samples
          </h3>

          {samples.length === 0 ? (

            <p className="text-gray-500">
              No samples linked to this project yet.
            </p>

          ) : (

            <div className="space-y-3">

              {samples.map((sample) => (

                <div
                  key={sample.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >

                  <div>
                    <p className="font-semibold">
                      {sample.sample_number ||
                        `Sample #${sample.id}`}
                    </p>

                    <p className="text-sm text-gray-500">
                      {sample.sample_type ||
                        "Unknown type"}
                    </p>
                  </div>

                  <div className="text-right">

                    <p className="text-sm font-medium">
                      {sample.status || "Pending"}
                    </p>

                    <p className="text-xs text-gray-400">
                      {sample.received_date || "-"}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

      {/* TASK MODAL */}
      {showTaskModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl p-6 w-full max-w-lg">

            <h2 className="text-2xl font-bold mb-6">
              📋 إسناد مهمة لفني
            </h2>

            {/* TECHNICIAN */}

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                الفني
              </label>

              <select
                value={technicianId}
                onChange={(e) =>
                  setTechnicianId(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="">
                  اختر الفني
                </option>

                {technicians.map((tech) => (

                  <option
                    key={tech.id}
                    value={tech.id}
                  >
                    {tech.full_name}
                  </option>

                ))}

              </select>

            </div>

            {/* TEST TYPE */}

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                نوع الفحص
              </label>

              <select
                value={testType}
                onChange={(e) =>
                  setTestType(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="">
                  اختر نوع الفحص
                </option>

                <option value="concrete-strength">
                  فحص قوة عينات الخرسانة الأسمنتية
                </option>

                <option value="field-density">
                  اختبار الكثافة الحقلية بطريقة المخروط الرملي
                </option>

              </select>

            </div>

            {/* TASK NAME */}

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                اسم المهمة
              </label>

              <input
                type="text"
                value={taskName}
                onChange={(e) =>
                  setTaskName(e.target.value)
                }
                className="w-full border rounded-lg p-3"
                placeholder="مثال: أخذ عينات تربة"
              />

            </div>

            {/* DESCRIPTION */}

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                وصف المهمة
              </label>

              <textarea
                value={taskDescription}
                onChange={(e) =>
                  setTaskDescription(e.target.value)
                }
                className="w-full border rounded-lg p-3"
                rows={4}
                placeholder="اكتب تفاصيل المهمة..."
              />

            </div>

            {/* PRIORITY */}

            <div className="mb-6">

              <label className="block mb-2 font-medium">
                الأولوية
              </label>

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="منخفضة">
                  منخفضة
                </option>

                <option value="عادي">
                  عادي
                </option>

                <option value="عالية">
                  عالية
                </option>

              </select>

            </div>

            {/* MODAL BUTTONS */}

            <div className="flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowTaskModal(false)
                }
                className="border border-gray-300 px-5 py-2 rounded-lg"
              >
                إلغاء
              </button>

              <button
                onClick={saveTask}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
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