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

  concrete_test_results?: ConcreteTestResult[];
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

  field_density_results?: FieldDensityResult[];
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
    full_name?: string | null;
  } | null;

  concrete_tests?: ConcreteTest[];

  field_density_tests?: FieldDensityTest[];
};

type TaskImage = {
  id: number;
  task_id: number;
  image_url: string;
};

type ReviewerMap = Record<number, string>;

/* =========================================================
   PAGE
========================================================= */

export default function TaskResultsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [reviewers, setReviewers] =
    useState<ReviewerMap>({});

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [images, setImages] =
    useState<TaskImage[]>([]);

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     INITIALIZE
  ======================================================= */

  useEffect(() => {
    const initialize = async () => {
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

      await loadResults();
    };

    initialize();
  }, [router]);

  /* =======================================================
     LOAD ALL RESULTS
  ======================================================= */

  async function loadResults() {
    console.log(
      "🔥🔥 LOAD RESULTS STARTED 🔥🔥"
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
          id,
          task_name,
          task_description,
          priority,
          status,
          arrival_time,
          completed_at,
          field_result,
          field_notes,
          technician_id,
          users:technician_id (
            id,
            full_name
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

      const allTasks =
        (tasksData || []) as any[];

      console.log(
        "🔥 NUMBER OF TASKS:",
        allTasks.length
      );

      /* =====================================================
         2. TASK IDS
      ===================================================== */

      const taskIds = allTasks
        .map((task) => Number(task.id))
        .filter((id) => Number.isFinite(id));

      console.log(
        "🔥 TASK IDS:",
        taskIds
      );

      /* =====================================================
         3. LOAD CONCRETE TESTS
      ===================================================== */

      let concreteTestsData: any[] = [];

      if (taskIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("concrete_tests")
          .select(`
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

            protection_capping,

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
            reviewed_at
          `)
          .in("task_id", taskIds)
          .order("id", {
            ascending: false,
          });

        console.log(
          "🔥🔥 CONCRETE TESTS DATA:",
          data
        );

        console.log(
          "🔥🔥 CONCRETE TESTS ERROR:",
          error
        );

        if (error) {
          console.error(
            "LOAD CONCRETE TESTS ERROR:",
            error
          );
        } else {
          concreteTestsData =
            data || [];
        }
      }

      console.log(
        "🔥 NUMBER OF CONCRETE TESTS:",
        concreteTestsData.length
      );

      /* =====================================================
         4. LOAD CONCRETE TEST RESULTS
      ===================================================== */

      const concreteTestIds =
        concreteTestsData
          .map((test) =>
            Number(test.id)
          )
          .filter((id) =>
            Number.isFinite(id)
          );

      console.log(
        "🔥 CONCRETE TEST IDS:",
        concreteTestIds
      );

      let concreteResultsData: any[] =
        [];

      if (
        concreteTestIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from(
            "concrete_test_results"
          )
          .select(`
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
          `)
          .in(
            "test_id",
            concreteTestIds
          )
          .order(
            "sample_no",
            {
              ascending: true,
            }
          );

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
            "LOAD CONCRETE RESULTS ERROR:",
            error
          );
        } else {
          concreteResultsData =
            data || [];
        }
      }

      console.log(
        "🔥 NUMBER OF CONCRETE SAMPLE RESULTS:",
        concreteResultsData.length
      );

      /* =====================================================
         5. CONNECT RESULTS TO CONCRETE TESTS
      ===================================================== */

      const concreteTestsWithResults =
        concreteTestsData.map(
          (test: any) => {
            const results =
              concreteResultsData.filter(
                (result: any) =>
                  Number(
                    result.test_id
                  ) ===
                  Number(test.id)
              );

            console.log(
              `🧱 TEST ${test.id} -> RESULTS:`,
              results
            );

            return {
              ...test,

              concrete_test_results:
                results,
            };
          }
        );

      console.log(
        "🔥🔥 CONCRETE TESTS WITH RESULTS:",
        concreteTestsWithResults
      );

      /* =====================================================
         6. LOAD FIELD DENSITY
      ===================================================== */

      let densityData: any[] = [];

      const {
        data: loadedDensity,
        error: densityError,
      } = await supabase
        .from(
          "field_density_tests"
        )
        .select(`
          id,
          task_id,

          order_no,
          sample_code,

          sampling_date,
          test_date,

          sampled_by,

          classification,
          checked_by,

          sample_location,
          source_material,

          method,

          mdd,
          optimum_moisture,

          reference_report,
          reference_date,

          technical_manager,
          report_review,

          status,

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

      console.log(
        "🔥 FIELD DENSITY DATA:",
        loadedDensity
      );

      console.log(
        "🔥 FIELD DENSITY ERROR:",
        densityError
      );

      if (densityError) {
        console.error(
          "LOAD FIELD DENSITY ERROR:",
          densityError
        );
      } else {
        densityData =
          loadedDensity || [];
      }

      /* =====================================================
         7. CONNECT EVERYTHING TO TASKS
      ===================================================== */

      const finalTasks: Task[] =
        allTasks.map(
          (task: any) => {
            const taskId =
              Number(task.id);

            const taskConcreteTests =
              concreteTestsWithResults.filter(
                (test: any) =>
                  Number(
                    test.task_id
                  ) === taskId
              );

            const taskDensityTests =
              densityData.filter(
                (density: any) =>
                  Number(
                    density.task_id
                  ) === taskId
              );

            console.log(
              `📋 TASK ${taskId}`,
              {
                task,
                concreteTests:
                  taskConcreteTests,
                densityTests:
                  taskDensityTests,
              }
            );

            return {
              ...task,

              concrete_tests:
                taskConcreteTests,

              field_density_tests:
                taskDensityTests,
            };
          }
        );

      /* =====================================================
         8. GET REVIEWER IDS
      ===================================================== */

      const reviewerIds =
        concreteTestsWithResults
          .map(
            (test: any) =>
              test.reviewed_by
          )
          .filter(
            (id: any) =>
              id !== null &&
              id !== undefined
          )
          .map((id: any) =>
            Number(id)
          )
          .filter((id) =>
            Number.isFinite(id)
          );

      const uniqueReviewerIds = [
        ...new Set(
          reviewerIds
        ),
      ];

      console.log(
        "🔥 REVIEWER IDS:",
        uniqueReviewerIds
      );

      /* =====================================================
         9. LOAD REVIEWER NAMES
      ===================================================== */

      if (
        uniqueReviewerIds.length > 0
      ) {
        const {
          data: reviewersData,
          error: reviewersError,
        } = await supabase
          .from("users")
          .select(`
            id,
            full_name,
            username
          `)
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

        if (reviewersError) {
          console.error(
            "LOAD REVIEWERS ERROR:",
            reviewersError
          );
        } else {
          const reviewerMap: ReviewerMap =
            {};

          (
            reviewersData || []
          ).forEach(
            (reviewer: any) => {
              reviewerMap[
                Number(
                  reviewer.id
                )
              ] =
                reviewer.full_name ||
                reviewer.username ||
                "مستخدم غير معروف";
            }
          );

          setReviewers(
            reviewerMap
          );
        }
      } else {
        setReviewers({});
      }

      /* =====================================================
         10. SHOW ONLY COMPLETED TASKS
      ===================================================== */

      const completedTasks =
        finalTasks.filter(
          (task: any) => {
            const status =
              String(
                task.status || ""
              )
                .trim()
                .toLowerCase();

            const completedStatuses = [
              "completed",
              "complete",
              "done",
              "finished",
              "منجز",
              "منجزة",
              "مكتمل",
              "مكتملة",
            ];

            const isCompletedByStatus =
              completedStatuses.includes(
                status
              );

            const isCompletedByDate =
              !!task.completed_at;

            return (
              isCompletedByStatus ||
              isCompletedByDate
            );
          }
        );

      console.log(
        "🔥🔥 COMPLETED TASKS:",
        completedTasks
      );

      /*
       * إذا كان نظام المهام عندك لا يضع status = Completed
       * ولكن يعتمد فقط على completed_at،
       * سيعمل الشرط أعلاه أيضًا.
       */

      setTasks(
        completedTasks
      );

      /* =====================================================
         11. LOAD ALL IMAGES
      ===================================================== */

      const {
        data: imagesData,
        error: imagesError,
      } = await supabase
        .from("task_images")
        .select("*");

      console.log(
        "🔥 IMAGES:",
        imagesData
      );

      console.log(
        "🔥 IMAGES ERROR:",
        imagesError
      );

      if (imagesError) {
        console.error(
          "LOAD IMAGES ERROR:",
          imagesError
        );
      } else {
        setImages(
          (imagesData ||
            []) as TaskImage[]
        );
      }

      console.log(
        "🔥🔥 FINAL TASKS SET:",
        completedTasks
      );
    } catch (error) {
      console.error(
        "🔥🔥 LOAD TASK RESULTS ERROR:",
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

    console.log(
      "👤 REVIEWING USER:",
      currentUser
    );

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
      .eq(
        "id",
        testId
      );

    if (error) {
      console.error(
        "REVIEW CONCRETE TEST ERROR:",
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
      .eq(
        "id",
        taskId
      );

    if (error) {
      console.error(
        "DELETE TASK ERROR:",
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
        "LOAD TASK IMAGES ERROR:",
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
     DATE FORMAT
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

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }

    return parsedDate.toLocaleString(
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
     PAGE
  ======================================================= */

  return (
    <ProtectedRoute>
      <div className="p-6">

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
            className="bg-green-700 text-white px-4 py-2 rounded-lg print:hidden"
          >
            🖨️ طباعة
          </button>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <p>
            جاري تحميل النتائج...
          </p>
        ) : tasks.length ===
          0 ? (
          <div className="text-gray-500 border rounded-lg p-6 bg-white">
            لا توجد مهام منجزة حالياً
          </div>
        ) : (
          <div className="space-y-6">

            {tasks.map(
              (
                task
              ) => {
                const concreteTests =
                  task.concrete_tests ||
                  [];

                const fieldDensities =
                  task.field_density_tests ||
                  [];

                return (
                  <div
                    key={
                      task.id
                    }
                    className="border rounded-xl p-5 shadow bg-white"
                  >

                    {/* =================================================
                        TASK HEADER
                    ================================================= */}

                    <div className="flex flex-wrap items-start justify-between gap-3">

                      <div>
                        <h2 className="text-xl font-bold">
                          {task.task_name}
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                          رقم المهمة:{" "}
                          <span className="font-bold text-black">
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
                        PRINT FORM
                    ================================================= */}

                    {concreteTests.length >
                      0 && (
                      <div className="flex justify-end mt-4 print:hidden">

                        <button
                          onClick={() => {
                            router.push(
                              `/technician/tests/${task.id}?print=true`
                            );
                          }}
                          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold"
                        >
                          🖨️ طباعة نموذج الفحص / PDF
                        </button>

                      </div>
                    )}

                    {/* =================================================
                        TASK INFORMATION
                    ================================================= */}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-5 text-sm">

                      <p>
                        <strong>
                          📍 وقت الوصول:
                        </strong>{" "}
                        {formatSaudiDate(
                          task.arrival_time
                        )}
                      </p>

                      <p>
                        <strong>
                          👷 الفني:
                        </strong>{" "}
                        {task.users
                          ?.full_name ||
                          "غير محدد"}
                      </p>

                      <p>
                        <strong>
                          📌 الحالة:
                        </strong>{" "}
                        {task.status ||
                          "غير محدد"}
                      </p>

                      <p>
                        <strong>
                          النتيجة:
                        </strong>{" "}
                        {task.field_result ||
                          "لا توجد"}
                      </p>

                      <p>
                        <strong>
                          الملاحظات:
                        </strong>{" "}
                        {task.field_notes ||
                          "لا توجد"}
                      </p>

                      <p>
                        <strong>
                          تاريخ الإنجاز:
                        </strong>{" "}
                        {formatSaudiDate(
                          task.completed_at
                        )}
                      </p>

                    </div>

                    {/* =================================================
                        FIELD DENSITY
                    ================================================= */}

                    {fieldDensities.length >
                      0 && (
                      <div className="mt-6">

                        <h3 className="font-bold text-lg mb-3">
                          🧪 نماذج Field Density
                        </h3>

                        {fieldDensities.map(
                          (
                            fieldDensity
                          ) => (
                            <div
                              key={
                                fieldDensity.id
                              }
                              className="mb-4 border border-orange-300 bg-orange-50 rounded-lg p-4"
                            >

                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">

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
                                <div className="mt-4 overflow-x-auto">

                                  <table className="w-full border-collapse border border-black text-xs">

                                    <thead>
                                      <tr className="bg-orange-200">

                                        <th className="border border-black p-2">
                                          العينة
                                        </th>

                                        <th className="border border-black p-2">
                                          Field Sample
                                        </th>

                                        <th className="border border-black p-2">
                                          Station
                                        </th>

                                        <th className="border border-black p-2">
                                          Moisture
                                        </th>

                                        <th className="border border-black p-2">
                                          Wet Density
                                        </th>

                                        <th className="border border-black p-2">
                                          Dry Density
                                        </th>

                                        <th className="border border-black p-2">
                                          Compaction
                                        </th>

                                      </tr>
                                    </thead>

                                    <tbody>

                                      {fieldDensity.field_density_results.map(
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

                      </div>
                    )}

                    {/* =================================================
                        CONCRETE TESTS
                    ================================================= */}

                    {concreteTests.length >
                      0 && (
                      <div className="mt-6">

                        <h3 className="font-bold text-lg mb-3">
                          🧱 فحوصات قوة الخرسانة
                        </h3>

                        {concreteTests.map(
                          (
                            concreteTest
                          ) => (
                            <div
                              key={
                                concreteTest.id
                              }
                              className="mb-5 border border-blue-300 bg-blue-50 rounded-lg p-4"
                            >

                              {/* TEST TITLE */}

                              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">

                                <h4 className="font-bold text-lg">
                                  🧱 فحص قوة الخرسانة
                                </h4>

                                <span className="text-xs bg-white border border-blue-300 rounded px-3 py-1">
                                  Test ID:{" "}
                                  {
                                    concreteTest.id
                                  }
                                </span>

                              </div>

                              {/* =================================================
                                  TEST INFORMATION
                              ================================================= */}

                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">

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
                                    "-"}{" "}
                                  Kg/cm²
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
                                    "-"}{" "}
                                  °C
                                </p>

                                <p>
                                  <strong>
                                    Curing Temp:
                                  </strong>{" "}
                                  {concreteTest.curing_temperature ??
                                    "-"}{" "}
                                  °C
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
                                    "-"}{" "}
                                  Kg/cm²
                                </p>

                                <p>
                                  <strong>
                                    Acceptance:
                                  </strong>{" "}
                                  <span
                                    className={
                                      concreteTest.acceptance_status ===
                                      "Accepted"
                                        ? "text-green-700 font-bold"
                                        : concreteTest.acceptance_status ===
                                          "Not Accepted"
                                        ? "text-red-700 font-bold"
                                        : ""
                                    }
                                  >
                                    {concreteTest.acceptance_status ||
                                      "-"}
                                  </span>
                                </p>

                                <p>
                                  <strong>
                                    Tested By ID:
                                  </strong>{" "}
                                  {concreteTest.tested_by ??
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

                              {/* =================================================
                                  REVIEW
                              ================================================= */}

                              <div className="mt-5 border-t border-blue-300 pt-4">

                                {concreteTest.reviewed_by ? (
                                  <div className="bg-green-100 border border-green-300 rounded-lg p-4">

                                    <p className="font-bold text-green-800">
                                      ✅ تمت مراجعة نتائج الفحص
                                    </p>

                                    <p className="text-sm mt-2">
                                      تمت المراجعة بواسطة:{" "}
                                      <span className="font-semibold">
                                        {
                                          reviewers[
                                            Number(
                                              concreteTest.reviewed_by
                                            )
                                          ] ||
                                          "مستخدم غير معروف"
                                        }
                                      </span>
                                    </p>

                                    <p className="text-sm mt-1">
                                      تاريخ المراجعة:{" "}
                                      <span className="font-semibold">
                                        {formatSaudiDate(
                                          concreteTest.reviewed_at
                                        )}
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

                              {/* =================================================
                                  SAMPLE RESULTS TABLE
                              ================================================= */}

                              <div className="mt-5">

                                <div className="flex justify-between items-center mb-3">

                                  <h5 className="font-bold">
                                    📊 جدول نتائج العينات التي عباها الفني
                                  </h5>

                                  <span className="text-sm bg-white border rounded px-3 py-1">
                                    عدد العينات:{" "}
                                    {
                                      concreteTest
                                        .concrete_test_results
                                        ?.length ||
                                      0
                                    }
                                  </span>

                                </div>

                                {concreteTest
                                  .concrete_test_results
                                  ?.length >
                                0 ? (
                                  <div className="overflow-x-auto">

                                    <table className="w-full border-collapse border border-black text-[11px] bg-white">

                                      <thead>

                                        <tr className="bg-blue-200">

                                          <th className="border border-black p-2">
                                            العينة
                                          </th>

                                          <th className="border border-black p-2">
                                            Field Sample No.
                                          </th>

                                          <th className="border border-black p-2">
                                            جزء المنشأ
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
                                            L
                                          </th>

                                          <th className="border border-black p-2">
                                            W
                                          </th>

                                          <th className="border border-black p-2">
                                            H
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
                                            القوة
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

                                        {concreteTest.concrete_test_results.map(
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

                                              <td className="border border-black p-2 text-center">
                                                {result.length ??
                                                  "-"}
                                              </td>

                                              <td className="border border-black p-2 text-center">
                                                {result.width ??
                                                  "-"}
                                              </td>

                                              <td className="border border-black p-2 text-center">
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

                                              <td className="border border-black p-2 text-center font-bold text-blue-700">
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
                                    ⚠️ يوجد نموذج فحص خرسانة لهذه المهمة، لكن لا توجد سجلات في جدول{" "}
                                    <strong>
                                      concrete_test_results
                                    </strong>
                                    مرتبطة بهذا الفحص.
                                  </div>
                                )}

                              </div>

                              {/* =================================================
                                  NOTES
                              ================================================= */}

                              {concreteTest.notes && (
                                <div className="mt-4 bg-white border rounded-lg p-3">

                                  <strong>
                                    📝 الملاحظات:
                                  </strong>

                                  <p className="mt-1">
                                    {
                                      concreteTest.notes
                                    }
                                  </p>

                                </div>
                              )}

                            </div>
                          )
                        )}

                      </div>
                    )}

                    {/* =================================================
                        NO TESTS MESSAGE
                    ================================================= */}

                    {concreteTests.length ===
                      0 &&
                      fieldDensities.length ===
                        0 && (
                        <div className="mt-5 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                          لا يوجد نموذج فحص مرتبط بهذه المهمة.
                        </div>
                      )}

                    {/* =================================================
                        IMAGES
                    ================================================= */}

                    <div className="mt-6 border-t pt-5">

                      <button
                        onClick={() =>
                          loadImages(
                            task.id
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg print:hidden"
                      >
                        📷 عرض الصور
                      </button>

                      <div className="flex gap-4 mt-4 flex-wrap">

                        {images
                          .filter(
                            (
                              img
                            ) =>
                              img.task_id ===
                              task.id
                          )
                          .map(
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

                    </div>

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
