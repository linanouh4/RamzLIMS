"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

console.log("🔥🔥 THIS IS TASK RESULTS PAGE 🔥🔥");

/* =========================================================
   TYPES
========================================================= */

type User = {
  id: number;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
};

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

type ConcreteTestResult = {
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
};

type ConcreteTest = {
  id: number;
  task_id: number;

  order_no?: string | null;
  sample_code?: string | null;
  sample_location?: string | null;

  sampling_date?: string | null;
  test_date?: string | null;

  design_strength?: number | null;
  cement_content?: number | null;

  concrete_temperature?: number | null;
  curing_temperature?: number | null;

  protection_capping?: string | null;

  specimen_type?: string | null;
  test_specification?: string | null;

  tested_by?: number | null;
  sampled_by?: string | null;
  checked_by?: string | null;

  notes?: string | null;

  average_strength?: number | null;
  acceptance_status?: string | null;

  status?: string | null;

  reviewed_by?: number | null;
  reviewed_at?: string | null;

  concrete_test_results: ConcreteTestResult[];
};

type FieldDensityTest = {
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

  field_density_results: FieldDensityResult[];
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

  users?: User | null;

  concrete_tests: ConcreteTest[];

  field_density_tests: FieldDensityTest[];
};

type TaskImage = {
  id: number;
  task_id: number;
  image_url: string;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function TaskResultsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<User | null>(null);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [images, setImages] =
    useState<TaskImage[]>([]);

  const [reviewers, setReviewers] =
    useState<Record<number, string>>({});

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     INITIALIZE
  ======================================================= */

  useEffect(() => {
    const user = getSavedUser();

    console.log(
      "🔥 CURRENT LOGGED USER:",
      user
    );

    if (!user) {
      router.push("/");
      return;
    }

    setCurrentUser(user);

    loadResults();
  }, [router]);

  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  async function loadResults() {
    console.log(
      "🔥🔥🔥 LOAD RESULTS STARTED 🔥🔥🔥"
    );

    setLoading(true);

    try {
      /* =====================================================
         1. LOAD TASKS
      ===================================================== */

      const {
        data: tasksData,
        error: tasksError,
      } = await supabase
        .from("tasks")
        .select(`
          *,
          users:technician_id (
            id,
            full_name,
            username
          )
        `)
        .order("id", {
          ascending: false,
        });

      console.log(
        "🔥 TASKS DATA:",
        tasksData
      );

      console.log(
        "🔥 TASKS ERROR:",
        tasksError
      );

      if (tasksError) {
        alert(
          "خطأ في تحميل المهام:\n" +
            tasksError.message
        );

        return;
      }

      const rawTasks =
        (tasksData || []) as any[];

      console.log(
        "🔥 NUMBER OF TASKS:",
        rawTasks.length
      );

      if (rawTasks.length === 0) {
        setTasks([]);
        return;
      }

      /* =====================================================
         2. LOAD CONCRETE TESTS DIRECTLY
         
         مهم:
         لا نعتمد على:
         tasks -> concrete_tests
         
         بل نبحث مباشرة باستخدام task_id.
      ===================================================== */

      const taskIds = rawTasks.map(
        (task) => Number(task.id)
      );

      console.log(
        "🔥 TASK IDS:",
        taskIds
      );

      const {
        data: concreteTestsData,
        error: concreteTestsError,
      } = await supabase
        .from("concrete_tests")
        .select("*")
        .in("task_id", taskIds)
        .order("id", {
          ascending: false,
        });

      console.log(
        "🔥🔥 CONCRETE TESTS DATA:",
        concreteTestsData
      );

      console.log(
        "🔥🔥 CONCRETE TESTS ERROR:",
        concreteTestsError
      );

      if (concreteTestsError) {
        console.error(
          "❌ CONCRETE TESTS LOAD ERROR:",
          concreteTestsError
        );
      }

      const rawConcreteTests =
        (concreteTestsData || []) as any[];

      console.log(
        "🔥 NUMBER OF CONCRETE TESTS:",
        rawConcreteTests.length
      );

      /* =====================================================
         3. LOAD CONCRETE SAMPLE RESULTS
      ===================================================== */

      const concreteTestIds =
        rawConcreteTests.map(
          (test) => Number(test.id)
        );

      console.log(
        "🔥 CONCRETE TEST IDS:",
        concreteTestIds
      );

      let rawConcreteResults: any[] = [];

      if (concreteTestIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("concrete_test_results")
          .select("*")
          .in(
            "test_id",
            concreteTestIds
          )
          .order("sample_no", {
            ascending: true,
          });

        console.log(
          "🔥🔥 CONCRETE SAMPLE RESULTS:",
          data
        );

        console.log(
          "🔥🔥 CONCRETE SAMPLE RESULTS ERROR:",
          error
        );

        if (error) {
          console.error(
            "❌ CONCRETE RESULTS ERROR:",
            error
          );
        } else {
          rawConcreteResults =
            data || [];
        }
      }

      console.log(
        "🔥 NUMBER OF SAMPLE RESULTS:",
        rawConcreteResults.length
      );

      /* =====================================================
         4. ATTACH SAMPLE RESULTS TO EACH CONCRETE TEST
      ===================================================== */

      const concreteTests: ConcreteTest[] =
        rawConcreteTests.map(
          (test) => {
            const testId =
              Number(test.id);

            const results =
              rawConcreteResults.filter(
                (result) =>
                  Number(
                    result.test_id
                  ) === testId
              );

            console.log(
              `🔥 TEST ${testId} SAMPLE RESULTS:`,
              results
            );

            return {
              ...test,

              id: testId,

              task_id:
                Number(
                  test.task_id
                ),

              concrete_test_results:
                results as ConcreteTestResult[],
            };
          }
        );

      console.log(
        "🔥🔥 CONCRETE TESTS WITH RESULTS:",
        concreteTests
      );

      /* =====================================================
         5. LOAD FIELD DENSITY
      ===================================================== */

      const {
        data: densityData,
        error: densityError,
      } = await supabase
        .from("field_density_tests")
        .select("*")
        .in(
          "task_id",
          taskIds
        )
        .order("id", {
          ascending: false,
        });

      console.log(
        "🔥 FIELD DENSITY TESTS:",
        densityData
      );

      console.log(
        "🔥 FIELD DENSITY ERROR:",
        densityError
      );

      const rawDensityTests =
        (densityData || []) as any[];

      /* =====================================================
         6. LOAD FIELD DENSITY RESULTS DIRECTLY
      ===================================================== */

      const densityTestIds =
        rawDensityTests.map(
          (test) => Number(test.id)
        );

      let densityResultsData: any[] =
        [];

      if (
        densityTestIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from("field_density_results")
          .select("*")
          .in(
            "test_id",
            densityTestIds
          )
          .order("sample_no", {
            ascending: true,
          });

        console.log(
          "🔥 FIELD DENSITY RESULTS:",
          data
        );

        console.log(
          "🔥 FIELD DENSITY RESULTS ERROR:",
          error
        );

        if (!error) {
          densityResultsData =
            data || [];
        }
      }

      /* =====================================================
         7. ATTACH FIELD DENSITY RESULTS
      ===================================================== */

      const fieldDensityTests:
        FieldDensityTest[] =
        rawDensityTests.map(
          (test) => {
            const results =
              densityResultsData.filter(
                (result) =>
                  Number(
                    result.test_id
                  ) ===
                  Number(test.id)
              );

            return {
              ...test,

              id: Number(
                test.id
              ),

              task_id:
                Number(
                  test.task_id
                ),

              field_density_results:
                results as FieldDensityResult[],
            };
          }
        );

      /* =====================================================
         8. BUILD FINAL TASKS
      ===================================================== */

      const finalTasks: Task[] =
        rawTasks.map(
          (task) => {
            const taskId =
              Number(task.id);

            const taskConcreteTests =
              concreteTests.filter(
                (test) =>
                  Number(
                    test.task_id
                  ) === taskId
              );

            const taskDensityTests =
              fieldDensityTests.filter(
                (test) =>
                  Number(
                    test.task_id
                  ) === taskId
              );

            console.log(
              `🔥🔥 TASK ${taskId}`,
              {
                concreteTests:
                  taskConcreteTests,

                densityTests:
                  taskDensityTests,
              }
            );

            return {
              ...task,

              id: taskId,

              concrete_tests:
                taskConcreteTests,

              field_density_tests:
                taskDensityTests,
            };
          }
        );

      /* =====================================================
         9. LOAD REVIEWERS
      ===================================================== */

      const reviewerIds =
        concreteTests
          .map(
            (test) =>
              test.reviewed_by
          )
          .filter(
            (
              id
            ): id is number =>
              id != null
          );

      const uniqueReviewerIds = [
        ...new Set(
          reviewerIds.map(
            (id) => Number(id)
          )
        ),
      ];

      console.log(
        "🔥 REVIEWER IDS:",
        uniqueReviewerIds
      );

      if (
        uniqueReviewerIds.length >
        0
      ) {
        const {
          data: reviewersData,
          error: reviewersError,
        } = await supabase
          .from("users")
          .select(
            "id, full_name, username"
          )
          .in(
            "id",
            uniqueReviewerIds
          );

        console.log(
          "🔥 REVIEWERS DATA:",
          reviewersData
        );

        console.log(
          "🔥 REVIEWERS ERROR:",
          reviewersError
        );

        if (!reviewersError) {
          const map: Record<
            number,
            string
          > = {};

          (
            reviewersData || []
          ).forEach(
            (reviewer: any) => {
              map[
                Number(
                  reviewer.id
                )
              ] =
                reviewer.full_name ||
                reviewer.username ||
                "مستخدم غير معروف";
            }
          );

          setReviewers(map);
        }
      }

      /* =====================================================
         10. LOAD IMAGES
      ===================================================== */

      const {
        data: imagesData,
        error: imagesError,
      } = await supabase
        .from("task_images")
        .select("*");

      console.log(
        "🔥 IMAGES DATA:",
        imagesData
      );

      console.log(
        "🔥 IMAGES ERROR:",
        imagesError
      );

      if (!imagesError) {
        setImages(
          (imagesData ||
            []) as TaskImage[]
        );
      }

      /* =====================================================
         FINAL
      ===================================================== */

      console.log(
        "🔥🔥🔥 FINAL TASKS:",
        finalTasks
      );

      console.log(
        "🔥🔥 FINAL CONCRETE TEST COUNT:",
        concreteTests.length
      );

      console.log(
        "🔥🔥 FINAL SAMPLE COUNT:",
        rawConcreteResults.length
      );

      setTasks(finalTasks);
    } catch (error) {
      console.error(
        "❌ LOAD TASK RESULTS ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء تحميل النتائج"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     REVIEW CONCRETE TEST
  ======================================================= */

  async function reviewConcreteTest(
    testId: number
  ) {
    if (!currentUser?.id) {
      alert(
        "لم يتم التعرف على المستخدم الحالي"
      );

      return;
    }

    const confirmed =
      window.confirm(
        "هل أنت متأكد من اعتماد ومراجعة نتائج اختبار الخرسانة؟"
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("concrete_tests")
      .update({
        reviewed_by:
          Number(
            currentUser.id
          ),

        reviewed_at:
          new Date().toISOString(),
      })
      .eq("id", testId);

    if (error) {
      console.error(
        "❌ REVIEW CONCRETE TEST ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء تسجيل المراجعة:\n" +
          error.message
      );

      return;
    }

    alert(
      "تم تسجيل المراجعة بنجاح ✅"
    );

    await loadResults();
  }

  /* =======================================================
     DELETE TASK
  ======================================================= */

  async function deleteTask(
    taskId: number
  ) {
    if (
      currentUser?.role !==
      "admin"
    ) {
      alert(
        "ليس لديك صلاحية حذف المهام"
      );

      return;
    }

    const confirmed =
      window.confirm(
        "هل أنت متأكد من حذف هذه المهمة نهائيًا؟"
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error(
        "❌ DELETE TASK ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء حذف المهمة:\n" +
          error.message
      );

      return;
    }

    setTasks(
      (prev) =>
        prev.filter(
          (task) =>
            task.id !==
            taskId
        )
    );

    alert(
      "تم حذف المهمة بنجاح 🗑️"
    );
  }

  /* =======================================================
     LOAD IMAGES
  ======================================================= */

  async function loadImages(
    taskId: number
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("task_images")
      .select("*")
      .eq(
        "task_id",
        taskId
      );

    if (error) {
      console.error(
        "❌ LOAD TASK IMAGES ERROR:",
        error
      );

      return;
    }

    setImages(
      (prev) => {
        const otherImages =
          prev.filter(
            (img) =>
              img.task_id !==
              taskId
          );

        return [
          ...otherImages,
          ...((data ||
            []) as TaskImage[]),
        ];
      }
    );
  }

  /* =======================================================
     DATE
  ======================================================= */

  function formatSaudiDate(
    date:
      | string
      | null
      | undefined
  ) {
    if (!date) {
      return "غير مسجل";
    }

    return new Date(
      date
    ).toLocaleString(
      "ar-SA",
      {
        timeZone:
          "Asia/Riyadh",

        year: "numeric",

        month: "2-digit",

        day: "2-digit",

        hour: "2-digit",

        minute: "2-digit",

        hour12: true,
      }
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <ProtectedRoute>
      <div className="p-6 bg-gray-100 min-h-screen">

        {/* =================================================
            BACK
        ================================================= */}

        <button
          onClick={() =>
            router.back()
          }
          className="flex items-center gap-2 text-gray-600 hover:text-blue-700 mb-5 font-medium print:hidden"
        >
          ← رجوع
        </button>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between mb-6">

          <h1 className="text-3xl font-bold">
            📋 نتائج المهام المنجزة
          </h1>

          <button
            onClick={() =>
              window.print()
            }
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg print:hidden"
          >
            🖨️ طباعة
          </button>

        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="bg-white rounded-xl p-6 shadow">
            جاري تحميل النتائج...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow text-gray-500">
            لا توجد نتائج حالياً
          </div>
        ) : (

          <div className="space-y-6">

            {tasks.map(
              (task) => {

                const concreteTests =
                  task.concrete_tests ||
                  [];

                const fieldDensities =
                  task.field_density_tests ||
                  [];

                const taskImages =
                  images.filter(
                    (img) =>
                      Number(
                        img.task_id
                      ) ===
                      Number(task.id)
                  );

                return (

                  <div
                    key={task.id}
                    className="border rounded-xl p-5 shadow bg-white"
                  >

                    {/* =================================================
                        TASK HEADER
                    ================================================= */}

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <h2 className="text-xl font-bold">
                          {task.task_name}
                        </h2>

                        <p className="mt-2">
                          🆔 رقم المهمة:
                          {" "}
                          <span className="font-semibold">
                            {task.id}
                          </span>
                        </p>

                      </div>

                      {currentUser?.role ===
                        "admin" && (
                        <button
                          onClick={() =>
                            deleteTask(
                              task.id
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg print:hidden"
                        >
                          🗑️ حذف المهمة
                        </button>
                      )}

                    </div>

                    {/* =================================================
                        TASK INFO
                    ================================================= */}

                    <div className="grid md:grid-cols-2 gap-2 mt-4">

                      <p>
                        📍 وقت الوصول:
                        {" "}
                        <span className="font-semibold">
                          {formatSaudiDate(
                            task.arrival_time
                          )}
                        </span>
                      </p>

                      <p>
                        👷 الفني:
                        {" "}
                        <span className="font-semibold">
                          {task.users
                            ?.full_name ||
                            "غير محدد"}
                        </span>
                      </p>

                      <p>
                        النتيجة:
                        {" "}
                        <span className="font-semibold">
                          {task.field_result ||
                            "لا توجد"}
                        </span>
                      </p>

                      <p>
                        الملاحظات:
                        {" "}
                        <span className="font-semibold">
                          {task.field_notes ||
                            "لا توجد"}
                        </span>
                      </p>

                      <p>
                        الحالة:
                        {" "}
                        <span className="font-semibold">
                          {task.status ||
                            "غير محدد"}
                        </span>
                      </p>

                      <p>
                        تاريخ الإنجاز:
                        {" "}
                        <span className="font-semibold">
                          {formatSaudiDate(
                            task.completed_at
                          )}
                        </span>
                      </p>

                    </div>

                    {/* =================================================
                        PRINT BUTTON
                    ================================================= */}

                    {concreteTests.length >
                      0 && (
                      <div className="flex justify-end mt-4 print:hidden">

                        <button
                          onClick={() =>
                            router.push(
                              `/technician/tests/${task.id}?print=true`
                            )
                          }
                          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold"
                        >
                          🖨️ طباعة نموذج فحص الخرسانة
                        </button>

                      </div>
                    )}

                    {/* =================================================
                        DEBUG INFORMATION
                    ================================================= */}

                    <div className="mt-4 bg-gray-50 border rounded-lg p-3 text-sm">

                      <span className="font-bold">
                        البيانات المحملة:
                      </span>

                      {" "}

                      Concrete Tests:

                      <span className="font-bold text-blue-700">
                        {" "}
                        {concreteTests.length}
                      </span>

                      {" | "}

                      Samples:

                      <span className="font-bold text-blue-700">
                        {" "}
                        {concreteTests.reduce(
                          (
                            total,
                            test
                          ) =>
                            total +
                            (
                              test.concrete_test_results ||
                              []
                            ).length,
                          0
                        )}
                      </span>

                      {" | "}

                      Field Density:

                      <span className="font-bold text-orange-700">
                        {" "}
                        {fieldDensities.length}
                      </span>

                    </div>

                    {/* =================================================
                        FIELD DENSITY
                    ================================================= */}

                    {fieldDensities.map(
                      (
                        fieldDensity
                      ) => (

                        <div
                          key={
                            fieldDensity.id
                          }
                          className="mt-5 border border-orange-300 bg-orange-50 rounded-lg p-4"
                        >

                          <h3 className="font-bold text-lg mb-4">
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

                          {/* FIELD DENSITY RESULTS */}

                          {fieldDensity
                            .field_density_results
                            ?.length >
                            0 && (

                            <div className="mt-5 overflow-x-auto">

                              <table className="w-full border-collapse border border-black text-xs">

                                <thead>

                                  <tr className="bg-orange-200">

                                    <th className="border border-black p-2">
                                      العينة
                                    </th>

                                    <th className="border border-black p-2">
                                      Field Sample No.
                                    </th>

                                    <th className="border border-black p-2">
                                      Station
                                    </th>

                                    <th className="border border-black p-2">
                                      Moisture %
                                    </th>

                                    <th className="border border-black p-2">
                                      Wet Density
                                    </th>

                                    <th className="border border-black p-2">
                                      Dry Density
                                    </th>

                                    <th className="border border-black p-2">
                                      Compaction %
                                    </th>

                                  </tr>

                                </thead>

                                <tbody>

                                  {fieldDensity
                                    .field_density_results
                                    .map(
                                      (
                                        result
                                      ) => (

                                        <tr
                                          key={
                                            result.id
                                          }
                                        >

                                          <td className="border border-black p-2 text-center">
                                            {
                                              result.sample_no
                                            }
                                          </td>

                                          <td className="border border-black p-2">
                                            {result.field_sample_no ||
                                              "-"}
                                          </td>

                                          <td className="border border-black p-2">
                                            {result.station ||
                                              "-"}
                                          </td>

                                          <td className="border border-black p-2 text-center">
                                            {result.moisture ??
                                              "-"}
                                          </td>

                                          <td className="border border-black p-2 text-center">
                                            {result.wet_density ??
                                              "-"}
                                          </td>

                                          <td className="border border-black p-2 text-center">
                                            {result.dry_density ??
                                              "-"}
                                          </td>

                                          <td className="border border-black p-2 text-center font-bold">
                                            {result.compaction ??
                                              "-"}
                                          </td>

                                        </tr>

                                      )
                                    )}

                                </tbody>

                              </table>

                            </div>

                          )}

                        </div>

                      )
                    )}

                    {/* =================================================
                        CONCRETE TESTS
                    ================================================= */}

                    {concreteTests.map(
                      (
                        concreteTest
                      ) => {

                        const sampleResults =
                          concreteTest
                            .concrete_test_results ||
                          [];

                        return (

                          <div
                            key={
                              concreteTest.id
                            }
                            className="mt-5 border border-blue-300 bg-blue-50 rounded-lg p-4"
                          >

                            {/* =========================================
                                TEST HEADER
                            ========================================= */}

                            <div className="flex items-center justify-between gap-3 mb-4">

                              <h3 className="font-bold text-lg">
                                🧱 فحص قوة الخرسانة
                              </h3>

                              <span className="text-xs bg-white border border-blue-300 rounded px-2 py-1">
                                Test ID:
                                {" "}
                                {concreteTest.id}
                              </span>

                            </div>

                            {/* =========================================
                                TEST INFORMATION
                            ========================================= */}

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">

                              <p>
                                <strong>
                                  Order No:
                                </strong>{" "}
                                {concreteTest.order_no ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Sample Code:
                                </strong>{" "}
                                {concreteTest.sample_code ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Sample Location:
                                </strong>{" "}
                                {concreteTest.sample_location ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Sampling Date:
                                </strong>{" "}
                                {concreteTest.sampling_date ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Test Date:
                                </strong>{" "}
                                {concreteTest.test_date ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Design Strength:
                                </strong>{" "}
                                {concreteTest.design_strength ??
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Cement Content:
                                </strong>{" "}
                                {concreteTest.cement_content ??
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Concrete Temp:
                                </strong>{" "}
                                {concreteTest.concrete_temperature ??
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Curing Temp:
                                </strong>{" "}
                                {concreteTest.curing_temperature ??
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Specimen Type:
                                </strong>{" "}
                                {concreteTest.specimen_type ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Test Specification:
                                </strong>{" "}
                                {concreteTest.test_specification ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Average Strength:
                                </strong>{" "}
                                {concreteTest.average_strength ??
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Acceptance:
                                </strong>{" "}
                                {concreteTest.acceptance_status ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Sampled By:
                                </strong>{" "}
                                {concreteTest.sampled_by ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Checked By:
                                </strong>{" "}
                                {concreteTest.checked_by ||
                                  "-"}
                              </p>

                              <p>
                                <strong>
                                  Status:
                                </strong>{" "}
                                {concreteTest.status ||
                                  "-"}
                              </p>

                            </div>

                            {/* =========================================
                                REVIEW
                            ========================================= */}

                            <div className="mt-5 border-t border-blue-300 pt-4">

                              {concreteTest.reviewed_by ? (

                                <div className="bg-green-100 border border-green-300 rounded-lg p-3">

                                  <p className="font-bold text-green-800">
                                    ✅ تمت مراجعة نتائج الفحص
                                  </p>

                                  <p className="text-sm mt-1">

                                    تمت المراجعة بواسطة:

                                    {" "}

                                    <span className="font-semibold">

                                      {reviewers[
                                        Number(
                                          concreteTest.reviewed_by
                                        )
                                      ] ||
                                        "مستخدم غير معروف"}

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
                                    reviewConcreteTest(
                                      concreteTest.id
                                    )
                                  }
                                  className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg font-semibold print:hidden"
                                >
                                  ✅ تمت المراجعة
                                </button>

                              )}

                            </div>

                            {/* =========================================
                                SAMPLE RESULTS
                            ========================================= */}

                            <div className="mt-5">

                              <div className="flex items-center justify-between mb-3">

                                <h4 className="font-bold text-base">

                                  📊 نتائج العينات

                                </h4>

                                <span className="text-sm font-semibold">

                                  عدد العينات:
                                  {" "}
                                  {sampleResults.length}

                                </span>

                              </div>

                              {sampleResults.length >
                              0 ? (

                                <div className="overflow-x-auto">

                                  <table className="w-full border-collapse border border-black text-xs bg-white">

                                    <thead>

                                      <tr className="bg-blue-200">

                                        <th className="border border-black p-2">
                                          العينة
                                        </th>

                                        <th className="border border-black p-2">
                                          Field Sample No.
                                        </th>

                                        <th className="border border-black p-2">
                                          الجزء
                                        </th>

                                        <th className="border border-black p-2">
                                          تاريخ العينة
                                        </th>

                                        <th className="border border-black p-2">
                                          Slump
                                        </th>

                                        <th className="border border-black p-2">
                                          العمر
                                        </th>

                                        <th className="border border-black p-2">
                                          L × W × H
                                        </th>

                                        <th className="border border-black p-2">
                                          المساحة
                                        </th>

                                        <th className="border border-black p-2">
                                          الحجم
                                        </th>

                                        <th className="border border-black p-2">
                                          الوزن
                                        </th>

                                        <th className="border border-black p-2">
                                          الوزن النوعي
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

                                        <th className="border border-black p-2">
                                          الملاحظات
                                        </th>

                                      </tr>

                                    </thead>

                                    <tbody>

                                      {sampleResults.map(
                                        (
                                          result
                                        ) => (

                                          <tr
                                            key={
                                              result.id
                                            }
                                            className="hover:bg-gray-50"
                                          >

                                            <td className="border border-black p-2 text-center font-bold">
                                              {
                                                result.sample_no
                                              }
                                            </td>

                                            <td className="border border-black p-2">
                                              {result.field_sample_no ||
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2">
                                              {result.structure_part ||
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2">
                                              {result.date_sampled ||
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center">
                                              {result.slump ??
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center">
                                              {result.age_days ??
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center whitespace-nowrap">

                                              {result.length ??
                                                "-"}

                                              {" × "}

                                              {result.width ??
                                                "-"}

                                              {" × "}

                                              {result.height ??
                                                "-"}

                                            </td>

                                            <td className="border border-black p-2 text-center">
                                              {result.area ??
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center">
                                              {result.volume ??
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center">
                                              {result.weight ??
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center">
                                              {result.unit_weight ??
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center">
                                              {result.load_kn ??
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center">
                                              {result.load_kg ??
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2 text-center font-bold">

                                              {result.strength ??
                                                "-"}

                                            </td>

                                            <td className="border border-black p-2">
                                              {result.break_type ||
                                                "-"}
                                            </td>

                                            <td className="border border-black p-2">
                                              {result.remarks ||
                                                "-"}
                                            </td>

                                          </tr>

                                        )
                                      )}

                                    </tbody>

                                  </table>

                                </div>

                              ) : (

                                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800">

                                  ⚠️ تم العثور على نموذج فحص الخرسانة، لكن لا توجد سجلات في جدول:

                                  {" "}

                                  <strong>
                                    concrete_test_results
                                  </strong>

                                  <div className="text-xs mt-2">

                                    Test ID:

                                    {" "}

                                    {concreteTest.id}

                                  </div>

                                </div>

                              )}

                            </div>

                            {/* =========================================
                                NOTES
                            ========================================= */}

                            {concreteTest.notes && (

                              <div className="mt-4 bg-white border rounded-lg p-3">

                                <strong>
                                  الملاحظات:
                                </strong>

                                {" "}

                                {concreteTest.notes}

                              </div>

                            )}

                          </div>

                        );
                      }
                    )}

                    {/* =================================================
                        NO CONCRETE TEST
                    ================================================= */}

                    {concreteTests.length ===
                      0 && (

                      <div className="mt-5 bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800">

                        ⚠️ لا يوجد نموذج فحص خرسانة مرتبط بهذه المهمة.

                        <div className="text-xs mt-2">

                          Task ID:

                          {" "}

                          {task.id}

                        </div>

                      </div>

                    )}

                    {/* =================================================
                        IMAGES
                    ================================================= */}

                    <button
                      onClick={() =>
                        loadImages(
                          task.id
                        )
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg mt-5 print:hidden"
                    >
                      📷 عرض الصور
                    </button>

                    {taskImages.length >
                    0 && (

                      <div className="flex gap-4 mt-4 flex-wrap">

                        {taskImages.map(
                          (
                            img
                          ) => (

                            <a
                              key={
                                img.id
                              }
                              href={
                                img.image_url
                              }
                              target="_blank"
                              rel="noreferrer"
                            >

                              <img
                                src={
                                  img.image_url
                                }
                                alt="Task"
                                className="w-40 h-40 object-cover rounded-xl border cursor-pointer hover:scale-105 transition"
                              />

                            </a>

                          )
                        )}

                      </div>

                    )}

                  </div>

                );
              }
            )}

          </div>

        )}

      </div>
    </ProtectedRoute>
  );
}
