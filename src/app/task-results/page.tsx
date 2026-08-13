"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

console.log("🔥🔥 THIS IS TASK RESULTS PAGE 🔥🔥");

type FieldDensityResult = {
  id: number;
  test_id: number;
  sample_no: number;
  field_sample_no?: string | null;
  station?: string | null;
  layer_thickness?: number | null;
  can_no?: string | null;
  can_empty?: number | null;
  can_wet?: number | null;
  can_dry?: number | null;
  moisture?: number | null;
  sand_before?: number | null;
  sand_after?: number | null;
  wet_soil?: number | null;
  sand_cone_plate?: number | null;
  sand_in_hole?: number | null;
  sand_density?: number | null;
  hole_volume?: number | null;
  wet_density?: number | null;
  dry_density?: number | null;
  compaction?: number | null;
};

type Task = {
  id: number;
  task_name: string;
  task_description?: string | null;
  priority?: string | null;
  status?: string | null;
  arrival_time?: string | null;
  completed_at?: string | null;
  field_result?: string | null;
  field_notes?: string | null;
  technician_id?: number | null;

  users?: {
    id: number;
    full_name: string;
  } | null;

  field_density_tests?: {
    id: number;
    task_id: number;
    order_no?: string | null;
    sample_code?: string | null;
    sampling_date?: string | null;
    test_date?: string | null;
    sampled_by?: string | null;
    classification?: string | null;
    checked_by?: string | null;
    sample_location?: string | null;
    source_material?: string | null;
    method?: string | null;
    mdd?: number | null;
    optimum_moisture?: number | null;
    reference_report?: string | null;
    reference_date?: string | null;
    technical_manager?: string | null;
    report_review?: string | null;
    status?: string | null;
    field_density_results?: FieldDensityResult[];
  }[];
};

type TaskImage = {
  id: number;
  task_id: number;
  image_url: string;
};

export default function TaskResultsPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [images, setImages] = useState<TaskImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔥 TASK RESULTS PAGE LOADED");
    loadResults();
  }, []);

  async function loadResults() {
    console.log("🔥 LOAD RESULTS RUNNING");

    setLoading(true);

    try {
      // 1. تحميل المهام
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          users:technician_id (
            id,
            full_name
          )
        `)
        .order("id", { ascending: false });

      console.log("TASK RESULTS:", tasksData);
      console.log("TASK RESULTS ERROR:", tasksError);

      if (tasksError) {
        alert(tasksError.message);
        return;
      }

      // 2. تحميل نماذج Field Density بشكل منفصل
      const { data: densityData, error: densityError } = await supabase
        .from("field_density_tests")
        .select(`
          *,
          field_density_results (
            id,
            test_id,
            sample_no,
            field_sample_no,
            station,
            layer_thickness,
            can_no,
            can_empty,
            can_wet,
            can_dry,
            moisture,
            sand_before,
            sand_after,
            wet_soil,
            sand_cone_plate,
            sand_in_hole,
            sand_density,
            hole_volume,
            wet_density,
            dry_density,
            compaction
          )
        `);

      console.log("FIELD DENSITY DATA:", densityData);
      console.log("FIELD DENSITY ERROR:", densityError);

      console.log(
        "🔥 NUMBER OF FIELD DENSITY TESTS:",
        densityData?.length
      );

      console.log(
        "🔥 FIELD DENSITY TESTS:",
        densityData
      );

      if (densityError) {
        console.error(
          "LOAD FIELD DENSITY ERROR:",
          densityError
        );
      }

      // 3. ربط نموذج Field Density بالمهمة عن طريق task_id
      const tasksWithDensity = (tasksData || []).map(
        (task: any) => ({
          ...task,

          field_density_tests: (densityData || []).filter(
            (density: any) =>
              Number(density.task_id) === Number(task.id)
          ),
        })
      );

      setTasks(tasksWithDensity as Task[]);

      // 4. تحميل صور جميع المهام
      const {
        data: imagesData,
        error: imagesError,
      } = await supabase
        .from("task_images")
        .select("*");

      if (imagesError) {
        console.error(
          "LOAD IMAGES ERROR:",
          imagesError
        );
      } else {
        setImages(
          (imagesData || []) as TaskImage[]
        );
      }
    } catch (error) {
      console.error(
        "LOAD TASK RESULTS ERROR:",
        error
      );

      alert("حدث خطأ أثناء تحميل النتائج");
    } finally {
      setLoading(false);
    }
  }

  async function loadImages(taskId: number) {
    const { data, error } = await supabase
      .from("task_images")
      .select("*")
      .eq("task_id", taskId);

    if (error) {
      console.error(
        "LOAD TASK IMAGES ERROR:",
        error
      );
      return;
    }

    setImages((prev) => {
      const otherImages = prev.filter(
        (img) => img.task_id !== taskId
      );

      return [
        ...otherImages,
        ...((data || []) as TaskImage[]),
      ];
    });
  }

  function formatSaudiDate(
    date: string | null | undefined
  ) {
    if (!date) return "غير مسجل";

    return new Date(date).toLocaleString(
      "ar-SA",
      {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
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

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">
            📋 نتائج المهام المنجزة
          </h1>

          <button
            onClick={() => window.print()}
            className="bg-green-700 text-white px-4 py-2 rounded-lg print:hidden"
          >
            🖨️ طباعة
          </button>
        </div>

        {loading ? (
          <p>جاري تحميل النتائج...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500">
            لا توجد نتائج حالياً
          </p>
        ) : (
          <div className="space-y-4">

            {tasks.map((task: Task) => {
              const fieldDensities =
                task.field_density_tests || [];

              return (
                <div
                  key={task.id}
                  className="border rounded-xl p-5 shadow bg-white"
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
                      {formatSaudiDate(
                        task.arrival_time
                      )}
                    </span>
                  </p>

                  <p className="mt-2">
                    👷 الفني:
                    <span className="font-semibold">
                      {" "}
                      {task.users?.full_name ||
                        "غير محدد"}
                    </span>
                  </p>

                  <p className="mt-2">
                    النتيجة:
                    <span className="font-semibold">
                      {" "}
                      {task.field_result ||
                        "لا توجد"}
                    </span>
                  </p>

                  <p className="mt-2">
                    الملاحظات:
                    <span className="font-semibold">
                      {" "}
                      {task.field_notes ||
                        "لا توجد"}
                    </span>
                  </p>

                  <p className="text-sm text-gray-500 mt-3">
                    تاريخ الإنجاز:
                    {" "}
                    {formatSaudiDate(
                      task.completed_at
                    )}
                  </p>

                  {/* نماذج Field Density */}

                  {fieldDensities.map(
                    (fieldDensity: any) => (
                      <div
                        key={fieldDensity.id}
                        className="mt-5 border border-orange-300 bg-orange-50 rounded-lg p-4"
                      >
                        <h3 className="font-bold text-lg mb-3">
                          🧪 نموذج Field Density
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">

                          <p>
                            <strong>
                              Order No:
                            </strong>{" "}
                            {fieldDensity.order_no ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Sample Code:
                            </strong>{" "}
                            {fieldDensity.sample_code ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Sampling Date:
                            </strong>{" "}
                            {fieldDensity.sampling_date ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Test Date:
                            </strong>{" "}
                            {fieldDensity.test_date ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Sampled By:
                            </strong>{" "}
                            {fieldDensity.sampled_by ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Classification:
                            </strong>{" "}
                            {fieldDensity.classification ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Sample Location:
                            </strong>{" "}
                            {fieldDensity.sample_location ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Source Material:
                            </strong>{" "}
                            {fieldDensity.source_material ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Method:
                            </strong>{" "}
                            {fieldDensity.method ||
                              "-"}
                          </p>

                          <p>
                            <strong>
                              MDD:
                            </strong>{" "}
                            {fieldDensity.mdd ??
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Optimum Moisture:
                            </strong>{" "}
                            {fieldDensity.optimum_moisture ??
                              "-"}
                          </p>

                          <p>
                            <strong>
                              Checked By:
                            </strong>{" "}
                            {fieldDensity.checked_by ||
                              "لم يتم التحقق"}
                          </p>

                        </div>

                      </div>
                    )
                  )}

                  {/* الصور */}

                  <button
                    onClick={() =>
                      loadImages(task.id)
                    }
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg mt-4"
                  >
                    📷 عرض الصور
                  </button>

                  <div className="flex gap-4 mt-4 flex-wrap">

                    {images
                      .filter(
                        (img: TaskImage) =>
                          img.task_id === task.id
                      )
                      .map(
                        (img: TaskImage) => (
                          <a
                            key={img.id}
                            href={img.image_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={img.image_url}
                              alt="Task"
                              className="w-40 h-40 object-cover rounded-xl border cursor-pointer hover:scale-105 transition"
                            />
                          </a>
                        )
                      )}

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}