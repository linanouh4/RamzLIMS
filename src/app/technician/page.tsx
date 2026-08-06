"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";
export default function TechnicianPage() {
  const [tasks, setTasks] = useState<any[]>([]);
const user = getSavedUser();
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
  }
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
  
  return (
    <ProtectedRoute>
      <div className="p-6">
        <h1 className="text-3xl font-bold">
          👷 Technician Dashboard
        </h1>

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
) : (
  <button
    onClick={() => confirmArrival(task.id)}
    className="bg-green-600 text-white px-4 py-2 rounded-lg"
  >
    📍 تأكيد الوصول
  </button>
)}
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