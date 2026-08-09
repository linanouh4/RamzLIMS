"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

export default function TaskResultsPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    loadResults();
    async function loadImages(taskId: number) {
  const { data, error } = await supabase
    .from("task_images")
    .select("*")
    .eq("task_id", taskId);

  if (!error) {
    setImages(data || []);
  }
}
  }, []);

  async function loadResults() {
   const { data, error } = await supabase
  .from("tasks")
  .select(`
    *,
    users:technician_id (
      id,
      full_name
    )
  `)
  .order("id", { ascending: false });
console.log(data);
    if (error) {
  console.log("ERROR:", error);
  alert(error.message);
  return;
}

console.log("RESULTS:", data);

setTasks(data || []);
console.log(data?.map(task => task.status));
  }
async function loadImages(taskId: number) {
  const { data, error } = await supabase
    .from("task_images")
    .select("*")
    .eq("task_id", taskId);

  if (!error) {
    setImages(data || []);
  }
}
  return (
    <ProtectedRoute>
      <div className="p-6">
<button
  onClick={() => router.back()}
  className="flex items-center gap-2 text-gray-600 hover:text-blue-700 mb-5 font-medium"
>
  ← رجوع
</button>

<h1 className="text-3xl font-bold mb-6">
  📋 نتائج المهام المنجزة
</h1>
        <h1 className="text-3xl font-bold mb-6">
          📋 نتائج المهام المنجزة
        </h1>
<button
  onClick={() => window.print()}
  className="bg-green-700 text-white px-4 py-2 rounded-lg mb-6"
>
  🖨️ طباعة التقرير
</button>
        {tasks.length === 0 ? (
          <p className="text-gray-500">
            لا توجد نتائج حالياً
          </p>
        ) : (

          <div className="space-y-4">

            {tasks.map((task) => (

              <div
                key={task.id}
                className="border rounded-xl p-5 shadow"
              >

                <h2 className="text-xl font-bold">
                  {task.task_name}
                </h2>
                <p className="mt-2">
  🆔 رقم المهمة:
  <span className="font-semibold">
    {" "}
    {task.id}
  </span>
</p>

<p className="mt-2">
  📍 وقت الوصول:
  <span className="font-semibold">
    {" "}
    {task.arrival_time
      ? new Date(task.arrival_time).toLocaleString()
      : "غير مسجل"}
  </span>
</p>
<p className="mt-2">
  👷 الفني:
  <span className="font-semibold">
    {" "}
   {task.users?.full_name || "غير محدد"}
  </span>
</p>
                <p className="mt-2">
                  النتيجة:
                  <span className="font-semibold">
                    {" "}
                    {task.field_result}
                  </span>
                </p>

                <p className="mt-2">
                  الملاحظات:
                  <span className="font-semibold">
                    {" "}
                    {task.field_notes}
                  </span>
                </p>

                <p className="text-sm text-gray-500 mt-3">
                  تاريخ الإنجاز:
                  {" "}
                  {task.completed_at}
                </p>
<button
  onClick={() => loadImages(task.id)}
  className="bg-blue-600 text-white px-3 py-2 rounded-lg mt-3"
>
  📷 عرض الصور
</button>

<div className="flex gap-4 mt-4 flex-wrap">
  {images
    .filter((img) => img.task_id === task.id)
    .map((img) => (
      <a
        key={img.id}
        href={img.image_url}
        target="_blank"
      >
        <img
          src={img.image_url}
          className="w-40 h-40 object-cover rounded-xl border cursor-pointer hover:scale-105 transition"
        />
      </a>
    ))}
</div>
              </div>

            ))}

          </div>

        )}

      </div>
    </ProtectedRoute>
  );
}