"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

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
    reviewed_by?: string | null;
  reviewed_at?: string | null;

  users?: {
    id: number;
    full_name: string;
  } | null;

  concrete_tests?: {
    id: number;
    task_id: number;
      reviewed_by?: number | null;
  reviewed_at?: string | null;
    reviewed_by_user?: {
    id: number;
    full_name?: string | null;
    username?: string | null;
  } | null;
    order_no?: string | null;
    sample_code?: string | null;
    sample_location?: string | null;
    sampling_date?: string | null;
    test_date?: string | null;
    design_strength?: number | null;
    cement_content?: number | null;
    concrete_temperature?: number | null;
    curing_temperature?: number | null;
    specimen_type?: string | null;
    test_specification?: string | null;
    tested_by?: number | null;
    sampled_by?: string | null;
    checked_by?: string | null;
    notes?: string | null;
    average_strength?: number | null;
    acceptance_status?: string | null;
    status?: string | null;

    concrete_test_results?: {
      id: number;
      test_id: number;
      sample_no: number;
      field_sample_no?: string | null;
      structure_part?: string | null;
      date_sampled?: string | null;
      slump?: number | null;
      age_days?: number | null;
      length?: number | null;
      width?: number | null;
      height?: number | null;
      area?: number | null;
      volume?: number | null;
      weight?: number | null;
      unit_weight?: number | null;
      load_kn?: number | null;
      load_kg?: number | null;
      strength?: number | null;
      break_type?: string | null;
      remarks?: string | null;
    }[];
  }[];

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
  const currentUser = getSavedUser();
  const [reviewers, setReviewers] = useState<
  Record<number, string>
>({});

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
    ),
    concrete_tests (
      id,
      task_id,
      order_no,
      sample_code,
      sample_location,
      sampling_date,
      test_date,
      design_strength,
      cement_content,
      concrete_temperature,
      curing_temperature,
      specimen_type,
      test_specification,
      tested_by, 
sampled_by, 
checked_by, 
notes, 
average_strength, 
acceptance_status, 
status,
reviewed_by,
reviewed_at,
      concrete_test_results (
        id,
        test_id,
        sample_no,
        field_sample_no,
        structure_part,
        date_sampled,
        slump,
        age_days,
        length,
        width,
        height,
        area,
        volume,
        weight,
        unit_weight,
        load_kn,
        load_kg,
        strength,
        break_type,
        remarks
      )
    )
  `)
  .order("id", { ascending: false });

      console.log("TASK RESULTS:", tasksData);
      const reviewerIds = (tasksData || [])
  .flatMap((task: any) =>
    (task.concrete_tests || [])
      .map((test: any) => test.reviewed_by)
      .filter((id: any) => id != null)
  );

const uniqueReviewerIds = [
  ...new Set(
    reviewerIds.map((id: any) => Number(id))
  ),
];

if (uniqueReviewerIds.length > 0) {
  const { data: reviewersData, error: reviewersError } =
    await supabase
      .from("users")
      .select("id, full_name, username")
      .in("id", uniqueReviewerIds);

  if (reviewersError) {
    console.error(
      "LOAD REVIEWERS ERROR:",
      reviewersError
    );
  } else {
    const reviewerMap: Record<number, string> = {};

    (reviewersData || []).forEach(
      (reviewer: any) => {
        reviewerMap[Number(reviewer.id)] =
          reviewer.full_name ||
          reviewer.username ||
          "مستخدم غير معروف";
      }
    );

    setReviewers(reviewerMap);
  }
}
 

console.log("REVIEWER IDS:", reviewerIds);
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
async function reviewConcreteTest(testId: number) {
  if (!currentUser?.id) {
    alert("لم يتم التعرف على المستخدم الحالي");
    return;
  }

  const confirmed = window.confirm(
    "هل أنت متأكد من اعتماد ومراجعة نتائج اختبار الخرسانة؟"
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("concrete_tests")
    .update({
      reviewed_by: Number(currentUser.id),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", testId);

  if (error) {
    console.error("REVIEW CONCRETE TEST ERROR:", error);
    alert("حدث خطأ أثناء تسجيل المراجعة:\n" + error.message);
    return;
  }

  alert("تم تسجيل المراجعة بنجاح ✅");

  await loadResults();
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
              const concreteTests =
  task.concrete_tests || [];
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
<div className="flex justify-end mb-4 print:hidden">
  <button
    onClick={() => {
     router.push(
  `/technician/tests/${task.id}?print=true`
);
    }}
    className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold"
  >
    🖨️ طباعة النموذج / PDF
  </button>
</div>
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
{/* نماذج فحص قوة الخرسانة */}

{concreteTests.map(
  (concreteTest) => (
    <div
      key={concreteTest.id}
      className="mt-5 border border-blue-300 bg-blue-50 rounded-lg p-4"
    >
      <h3 className="font-bold text-lg mb-3">
        🧱 فحص قوة الخرسانة
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">

        <p>
          <strong>Order No:</strong>{" "}
          {concreteTest.order_no || "-"}
        </p>

        <p>
          <strong>Sample Code:</strong>{" "}
          {concreteTest.sample_code || "-"}
        </p>

        <p>
          <strong>Sample Location:</strong>{" "}
          {concreteTest.sample_location || "-"}
        </p>

        <p>
          <strong>Sampling Date:</strong>{" "}
          {concreteTest.sampling_date || "-"}
        </p>

        <p>
          <strong>Test Date:</strong>{" "}
          {concreteTest.test_date || "-"}
        </p>

        <p>
          <strong>Design Strength:</strong>{" "}
          {concreteTest.design_strength ?? "-"}
        </p>

        <p>
          <strong>Specimen Type:</strong>{" "}
          {concreteTest.specimen_type || "-"}
        </p>

        <p>
          <strong>Test Specification:</strong>{" "}
          {concreteTest.test_specification || "-"}
        </p>

        <p>
          <strong>Average Strength:</strong>{" "}
          {concreteTest.average_strength ?? "-"}
        </p>

        <p>
          <strong>Acceptance:</strong>{" "}
          {concreteTest.acceptance_status || "-"}
        </p>

        <p>
          <strong>Sampled By:</strong>{" "}
          {concreteTest.sampled_by || "-"}
        </p>

        <p>
          <strong>Checked By:</strong>{" "}
          {concreteTest.checked_by || "-"}
        </p>

      </div>
{/* حالة المراجعة */}

<div className="mt-4 border-t border-blue-300 pt-4">

  {concreteTest.reviewed_by ? (
   <div className="bg-green-100 border border-green-300 rounded-lg p-3">

  <p className="font-bold text-green-800">
    ✅ تمت مراجعة نتائج الفحص
  </p>

  <p className="text-sm mt-1">
    تمت المراجعة بواسطة:
    {" "}
    <span className="font-semibold">
      {concreteTest.reviewed_by
        ? reviewers[Number(concreteTest.reviewed_by)] ||
          "مستخدم غير معروف"
        : "مستخدم غير معروف"}
    </span>
  </p>

  <p className="text-sm">
    تاريخ المراجعة:
    {" "}
    <span className="font-semibold">
      {concreteTest.reviewed_at
        ? formatSaudiDate(
            concreteTest.reviewed_at
          )
        : "-"}
    </span>
  </p>

</div>
  ) : (
    <button
      onClick={() =>
        reviewConcreteTest(concreteTest.id)
      }
      className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg font-semibold"
    >
      ✅ تمت المراجعة
    </button>
  )}

</div>
      {/* نتائج العينات */}

      {concreteTest.concrete_test_results &&
        concreteTest.concrete_test_results.length > 0 && (
          <div className="mt-4 overflow-x-auto">

            <table className="w-full border-collapse border border-black text-xs">

              <thead>
                <tr className="bg-blue-200">

                  <th className="border border-black p-2">
                    العينة
                  </th>

                  <th className="border border-black p-2">
                    Field Sample No.
                  </th>

                  <th className="border border-black p-2">
                    الأبعاد
                  </th>

                  <th className="border border-black p-2">
                    الحمل KN
                  </th>

                  <th className="border border-black p-2">
                    الحمل Kg
                  </th>

                  <th className="border border-black p-2">
                    القوة Kg/cm²
                  </th>

                  <th className="border border-black p-2">
                    نوع الكسر
                  </th>

                </tr>
              </thead>

              <tbody>

                {concreteTest.concrete_test_results.map(
                  (result) => (
                    <tr key={result.id}>

                      <td className="border border-black p-2 text-center">
                        {result.sample_no}
                      </td>

                      <td className="border border-black p-2">
                        {result.field_sample_no || "-"}
                      </td>

                      <td className="border border-black p-2 text-center">
                        {result.length ?? "-"} ×{" "}
                        {result.width ?? "-"} ×{" "}
                        {result.height ?? "-"}
                      </td>

                      <td className="border border-black p-2 text-center">
                        {result.load_kn ?? "-"}
                      </td>

                      <td className="border border-black p-2 text-center">
                        {result.load_kg ?? "-"}
                      </td>

                      <td className="border border-black p-2 text-center font-bold">
                        {result.strength ?? "-"}
                      </td>

                      <td className="border border-black p-2">
                        {result.break_type || "-"}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      {concreteTest.notes && (
        <p className="mt-3">
          <strong>الملاحظات:</strong>{" "}
          {concreteTest.notes}
        </p>
      )}

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