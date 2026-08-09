"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function TechnicianTasksPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        setLoading(false);
        return;
      }

      const user = JSON.parse(savedUser);

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("technician_id", user.id)
        .order("id", { ascending: false });

      if (error) {
        console.log("TASKS ERROR:", error);
        alert(error.message);
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.log("LOAD TASKS ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="p-6">

        <h1 className="text-3xl font-bold mb-6">
          🛠️ مهامي
        </h1>

        {loading ? (
          <div className="bg-white p-6 rounded-xl shadow">
            جاري تحميل المهام...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white p-6 rounded-xl shadow text-gray-500">
            لا توجد مهام مسندة إليك حاليًا.
          </div>
        ) : (
          <div className="space-y-4">

            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border rounded-xl p-5 shadow"
              >

                <div className="flex justify-between items-start gap-4">

                  <div>

                    <h2 className="text-xl font-bold">
                      {task.task_name}
                    </h2>

                    <p className="text-gray-600 mt-2">
                      {task.task_description || "لا يوجد وصف للمهمة"}
                    </p>

                    <div className="flex gap-4 mt-3 text-sm">

                      <span>
                        🆔 المهمة: {task.id}
                      </span>

                      <span>
                        📅 {task.assigned_date || "-"}
                      </span>

                    </div>

                    <p className="mt-2 text-sm">
                      الحالة:
                      <span className="font-semibold mr-2">
                        {task.status || "بانتظار البدء"}
                      </span>
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      router.push(`/technician/tests/${task.id}`)
                    }
                    className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg whitespace-nowrap"
                  >
                    فتح الفحص
                  </button>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}