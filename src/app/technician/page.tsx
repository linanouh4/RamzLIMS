"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

type Task = {
id: number;
task_name: string;
task_description?: string | null;
priority?: string | null;
status?: string | null;
technician_id?: number | string | null;
started_at?: string | null;
arrival_time?: string | null;
completed_at?: string | null;
field_result?: string | null;
field_notes?: string | null;
};

type TaskImage = {
id: number;
task_id: number;
image_url: string;
};

export default function TechnicianPage() {
const [tasks, setTasks] = useState<Task[]>([]);
const [taskImages, setTaskImages] = useState<TaskImage[]>([]);
const [printingTask, setPrintingTask] = useState<number | null>(null);
const [uploading, setUploading] = useState(false);

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

if (error) {
  console.error("LOAD TASKS ERROR:", error);
  return;
}

const loadedTasks = (data || []) as Task[];

setTasks(loadedTasks);

const images: TaskImage[] = [];

for (const task of loadedTasks) {
  const { data: taskImagesData, error: imagesError } =
    await supabase
      .from("task_images")
      .select("*")
      .eq("task_id", task.id);

  if (!imagesError && taskImagesData) {
    images.push(...(taskImagesData as TaskImage[]));
  }
}

setTaskImages(images);
}

async function loadTaskImages(taskId: number) {
const { data, error } = await supabase
.from("task_images")
.select("*")
.eq("task_id", taskId);

if (error) {
  console.error("LOAD TASK IMAGES ERROR:", error);
  return;
}

setTaskImages((prev) => {
  const otherImages = prev.filter(
    (img) => img.task_id !== taskId
  );

  return [
    ...otherImages,
    ...((data || []) as TaskImage[]),
  ];
});

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

try {
  const fileExt = file.name.split(".").pop() || "jpg";

  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("task-images")
    .upload(fileName, file);

  if (uploadError) {
    alert(uploadError.message);
    return;
  }

  const { data } = supabase.storage
    .from("task-images")
    .getPublicUrl(fileName);

  if (!data?.publicUrl) {
    alert("تعذر الحصول على رابط الصورة");
    return;
  }

  const { data: insertedData, error: dbError } =
    await supabase
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
    return;
  }

  alert("تم رفع الصورة بنجاح");

  await loadTaskImages(taskId);

  event.target.value = "";
} catch (error) {
  console.error("UPLOAD IMAGE ERROR:", error);
  alert("حدث خطأ أثناء رفع الصورة");
} finally {
  setUploading(false);
}

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

return ( <ProtectedRoute> <div className="p-6">

    <h1 className="text-3xl font-bold">
      👷 Technician Dashboard
    </h1>

    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">

      <div className="bg-white rounded-xl shadow p-5 md:col-span-3">

        {tasks.length === 0 ? (

          <p className="text-gray-500">
            لا توجد مهام حالياً
          </p>

        ) : (

          <div className="space-y-4">

            {tasks.map((task) => (

              <div
                key={task.id}
                className={`bg-white rounded-xl shadow p-5 ${
                  printingTask !== null &&
                  printingTask !== task.id
                    ? "hidden print:hidden"
                    : ""
                }`}
              >

                <h3 className="font-bold text-lg">
                  {task.task_name}
                </h3>

                <p className="text-gray-600 mt-1">
                  {task.task_description ||
                    "لا يوجد وصف للمهمة"}
                </p>

                <p className="text-sm text-blue-700 mt-2">
                  الأولوية: {task.priority || "عادي"}
                </p>

                <p className="text-sm text-green-700">
                  الحالة: {task.status || "بانتظار البدء"}
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  🆔 رقم المهمة: {task.id}
                </p>

                {task.status === "بانتظار البدء" ? (

                  <button
                    onClick={() => startTask(task.id)}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg mt-4"
                  >
                    ▶️ بدء المهمة
                  </button>

                ) : task.status === "جاري التنفيذ" ? (

                  <button
                    onClick={() => confirmArrival(task.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg mt-4"
                  >
                    📍 تأكيد الوصول
                  </button>

                ) : task.status === "تم الوصول للموقع" ? (

                  <div className="space-y-3 mt-4">

                    <label className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg cursor-pointer block text-center">
                      📷 رفع صورة

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) =>
                          uploadImage(e, task.id)
                        }
                      />
                    </label>

                    <a
                      href={`/technician/tests/${task.id}`}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg block text-center"
                    >
                      🧪 تعبئة نموذج الفحص
                    </a>

                    <input
                      id={`result-${task.id}`}
                      placeholder="نتيجة الفحص"
                      defaultValue={
                        task.field_result || ""
                      }
                      className="border rounded-lg p-2 w-full"
                    />

                    <textarea
                      id={`notes-${task.id}`}
                      placeholder="الملاحظات"
                      defaultValue={
                        task.field_notes || ""
                      }
                      className="border rounded-lg p-2 w-full"
                    />

                    <button
                      onClick={() => {
                        const resultElement =
                          document.getElementById(
                            `result-${task.id}`
                          ) as HTMLInputElement | null;
                        const notesElement =
                          document.getElementById(
                            `notes-${task.id}`
                          ) as HTMLTextAreaElement | null;
                        saveFieldResult(
                          task.id,
                          resultElement?.value || "",
                          notesElement?.value || ""
                        );
                      }}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg"
                    >
                      💾 حفظ النتيجة
                    </button>

                    <button
                      onClick={() =>
                        printTask(task.id)
                      }
                      className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg"
                    >
                      🖨️ طباعة المهمة
                    </button>

                  </div>

                ) : (

                  <span className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg inline-block mt-4">
                    ✅ {task.status}
                  </span>

                )}

                <div className="flex flex-wrap gap-3 mt-4">

                  {taskImages
                    .filter(
                      (img) =>
                        img.task_id === task.id
                    )
                    .map((img) => (

                      <img
                        key={img.id}
                        src={img.image_url}
                        alt="Task"
                        className="w-32 h-32 object-cover rounded-lg"
                      />

                    ))}

                </div>

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