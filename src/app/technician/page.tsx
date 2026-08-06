"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";
import ReportHeader from "@/components/reports/ReportHeader";
export default function TechnicianPage() {
const [tasks, setTasks] = useState<any[]>([]);
const [taskImages, setTaskImages] = useState<any[]>([]);
const user = getSavedUser();
const [selectedTask, setSelectedTask] = useState<number | null>(null);
const [uploading, setUploading] = useState(false);
useEffect(() => {
  loadTasks();
}, []);

async function loadTasks() {
  if (!user) return;

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("technician_id", user.id)
    .order("id", { ascending: false });

 if (!error) {
  setTasks(data || []);

  const images = [];

  for (const task of data || []) {
    const { data: taskImagesData } = await supabase
      .from("task_images")
      .select("*")
      .eq("task_id", task.id);

    if (taskImagesData) {
      images.push(...taskImagesData);
    }
  }

  setTaskImages(images);
}
}
async function loadTaskImages(taskId: number) {
  const { data, error } = await supabase
    .from("task_images")
    .select("*")
    .eq("task_id", taskId);

  if (!error) {
    setTaskImages(data || []);
  }
}
async function confirmArrival(taskId: number) {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "تم الوصول للموقع",
      arrival_time: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadTasks();
}
async function saveFieldResult(
  taskId: number,
  result: string,
  notes: string
) {
  const { error } = await supabase
    .from("tasks")
    .update({
      field_result: result,
      field_notes: notes,
      status: "تم الإنجاز",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    alert(error.message);
    return;
  }

  alert("تم حفظ نتيجة الفحص");

  await loadTasks();
}
async function uploadImage(
  event: React.ChangeEvent<HTMLInputElement>,
  taskId: number
) {
  const file = event.target.files?.[0];

  if (!file) return;

  setUploading(true);

 const fileExt = file.name.split(".").pop();

const fileName = `${Date.now()}-${Math.random()
  .toString(36)
  .substring(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("task-images")
    .upload(fileName, file);

  if (uploadError) {
    alert(uploadError.message);
    setUploading(false);
    return;
  }

  const { data } = supabase.storage
    .from("task-images")
    .getPublicUrl(fileName);

  const { data: insertedData, error: dbError } = await supabase
  .from("task_images")
  .insert({
    task_id: taskId,
    image_url: data.publicUrl,
  })
  .select();

console.log("INSERT RESULT:", insertedData);
console.log("INSERT ERROR:", dbError);
  if (dbError) {
  alert(dbError.message);
} else {
  alert("تم رفع الصورة بنجاح");

  await loadTaskImages(taskId);
}

setUploading(false);
}
async function startTask(taskId: number) {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "جاري التنفيذ",
      started_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadTasks();
}

  return (
    <ProtectedRoute>
     <div className="p-6">

  <ReportHeader />

  <div className="flex items-center gap-3 mb-6">
    <button
      onClick={() => window.history.back()}
      className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-xl"
    >
      ←
    </button>

    <h1 className="text-3xl font-bold">
      👷 Technician Dashboard
    </h1>
  </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-white rounded-xl shadow p-5 md:col-span-3">
  <h2 className="text-2xl font-bold mb-4">
    📋 المهام المسندة إلي
  </h2>

  {tasks.length === 0 ? (
    <p className="text-gray-500">
      لا توجد مهام حالياً
    </p>
  ) : (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="border rounded-xl p-4 flex justify-between items-center"
        >
          <div>
            <h3 className="font-bold text-lg">
              {task.task_name}
            </h3>

            <p className="text-gray-600 mt-1">
              {task.task_description}
            </p>

            <p className="text-sm text-blue-700 mt-2">
              الأولوية: {task.priority}
            </p>

            <p className="text-sm text-green-700">
              الحالة: {task.status}
            </p>
          </div>
{task.status === "بانتظار البدء" ? (
  <button
    onClick={() => startTask(task.id)}
    className="bg-blue-700 text-white px-4 py-2 rounded-lg"
  >
    ▶️ بدء المهمة
  </button>
) : task.status === "جاري التنفيذ" ? (
  <button
    onClick={() => confirmArrival(task.id)}
    className="bg-green-600 text-white px-4 py-2 rounded-lg"
  >
    📍 تأكيد الوصول
  </button>
) : task.status === "تم الوصول للموقع" ? (
  <label className="bg-purple-600 text-white px-4 py-2 rounded-lg cursor-pointer">
<div className="space-y-3">

  <label className="bg-purple-600 text-white px-4 py-2 rounded-lg cursor-pointer block text-center">
    📷 رفع صورة
<a
  href={`/technician/tests/${task.id}`}
  className="bg-orange-600 text-white px-4 py-2 rounded-lg block text-center mt-2"
>
  🧪 تعبئة نموذج الفحص
</a>
    <input
      type="file"
      accept="image/*"
      className="hidden"
      disabled={uploading}
      onChange={(e) => uploadImage(e, task.id)}
    />
  </label>

  <input
    id={`result-${task.id}`}
    placeholder="نتيجة الفحص"
    className="border rounded-lg p-2 w-full"
  />

  <textarea
    id={`notes-${task.id}`}
    placeholder="الملاحظات"
    className="border rounded-lg p-2 w-full"
  />

  <button
    onClick={() =>
      saveFieldResult(
        task.id,
        (document.getElementById(`result-${task.id}`) as HTMLInputElement).value,
        (document.getElementById(`notes-${task.id}`) as HTMLTextAreaElement).value
      )
    }
    className="bg-blue-700 text-white px-4 py-2 rounded-lg"
  >
    💾 حفظ النتيجة
  </button>

</div>
    <input
      type="file"
      accept="image/*"
      className="hidden"
      disabled={uploading}
      onChange={(e) => uploadImage(e, task.id)}
    />
  </label>
) : (
  <span className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
    ✅ {task.status}
  </span>
)}
{taskImages
  .filter((img) => img.task_id === task.id)
  .map((img) => (
    <img
      key={img.id}
      src={img.image_url}
      className="w-32 h-32 object-cover rounded-lg mt-3"
    />
  ))}
        </div>
      ))}
    </div>
  )}
</div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold">
              Site Visits
            </h2>
            <p className="text-gray-500 mt-2">
              No visits yet
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold">
              Field Results
            </h2>
            <p className="text-gray-500 mt-2">
              No results yet
            </p>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}