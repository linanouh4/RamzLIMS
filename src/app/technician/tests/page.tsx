"use client";

import BackButton from "@/components/BackButton";
import { useUiText } from "@/lib/uiText";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

type Task = {
  id: number;
  technician_id: number;
  task_name: string;
  task_description?: string | null;
  priority?: string | null;
  status?: string | null;
  field_result?: string | null;
  field_notes?: string | null;
};

export default function TechnicianTestsPage() {
  const ui = useUiText();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
const [printingTask, setPrintingTask] = useState<number | null>(null);
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const user = getSavedUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("technician_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      console.error("TASKS ERROR:", error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setTasks((data || []) as Task[]);
    setLoading(false);
  }
function printTask(taskId: number) {
  setPrintingTask(taskId);

  setTimeout(() => {
    window.print();

    setTimeout(() => {
      setPrintingTask(null);
    }, 500);
  }, 100);
}
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-6">

        <div className="max-w-7xl mx-auto">

          {/* العنوان */}
          <div className="mb-6 print:hidden">

            <BackButton onClick={() => router.back()} />

            <h1 className="text-3xl font-bold text-gray-800">
              {ui("🧪 نماذج الفحص")}
            </h1>

            <p className="text-gray-500 mt-1">
              {ui("المهام والفحوصات الميدانية المسندة إليك")}
            </p>

          </div>

          {/* المحتوى */}
          {loading ? (

            <div className="bg-white rounded-xl shadow p-6">
              {ui("جاري تحميل المهام...")}
            </div>

          ) : tasks.length === 0 ? (

            <div className="bg-white rounded-xl shadow p-6 text-gray-500">
              {ui("لا توجد مهام مسندة إليك حاليًا.")}
            </div>

          ) : (

            <div className="space-y-5">

              {tasks.map((task) => (

                <div
              key={task.id}
              className={`bg-white border rounded-xl shadow p-5 ${
              printingTask !== null && printingTask !== task.id
              ? "hidden print:hidden"
              : ""
             }`}
                >

                  {/* معلومات المهمة */}
                  <div className="mb-5">

                    <h2 className="text-xl font-bold text-gray-800">
                      {task.task_name}
                    </h2>

                    <p className="text-gray-600 mt-2">
                      {task.task_description ||
                        ui("لا يوجد وصف للمهمة")}
                    </p>

                    <div className="mt-3 space-y-1">

                      <p className="text-sm text-gray-600">
                        {ui("🆔 رقم المهمة:")} {task.id}
                      </p>

                      <p className="text-sm text-blue-700">
                        {ui("الأولوية:")} {ui(task.priority || "عادي")}
                      </p>

                      <p className="text-sm text-green-700">
                        {ui("الحالة:")}{" "}
                        {ui(task.status || "بانتظار البدء")}
                      </p>

                    </div>

                  </div>

                  {/* أزرار */}
                  <div className="flex flex-wrap gap-3 print:hidden">

                    <button
                      onClick={() =>
                        router.push(
                          `/technician/tests/${task.id}`
                        )
                      }
                      className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg"
                    >
                      {ui("🧪 فتح نموذج الفحص")}
                    </button>

                    <button
  onClick={() => printTask(task.id)}
  className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-lg"
>
  {ui("🖨️ طباعة المهمة")}
</button>

                  </div>

                  {/* بيانات الفحص إذا كانت محفوظة */}
                  {(task.field_result ||
                    task.field_notes) && (

                    <div className="mt-5 border-t pt-5">

                      {task.field_result && (
                        <div className="mb-4">

                          <h3 className="font-semibold text-gray-700">
                            {ui("نتيجة الفحص")}
                          </h3>

                          <p className="mt-1 text-gray-600">
                            {task.field_result}
                          </p>

                        </div>
                      )}

                      {task.field_notes && (
                        <div>

                          <h3 className="font-semibold text-gray-700">
                            {ui("الملاحظات")}
                          </h3>

                          <p className="mt-1 text-gray-600 whitespace-pre-wrap">
                            {task.field_notes}
                          </p>

                        </div>
                      )}

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

        </div>

      </div>
    </ProtectedRoute>
  );
}
