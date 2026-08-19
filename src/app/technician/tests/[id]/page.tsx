"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReportHeader from "@/components/reports/ReportHeader";

type User = {
  id: number;
  username?: string | null;
  full_name?: string | null;
};

type Reviewer = {
  id: number;
  full_name?: string | null;
  username?: string | null;
};

type Sample = {
  sample_no: number;
  field_sample_no: string;
  structure_part: string;
  date_sampled: string;
  slump: string;
  age_days: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  load_kn: string;
  break_type: string;
  remarks: string;
};

const emptySample = (sample_no: number): Sample => ({
  sample_no,
  field_sample_no: "",
  structure_part: "",
  date_sampled: "",
  slump: "",
  age_days: "",
  length: "",
  width: "",
  height: "",
  weight: "",
  load_kn: "",
  break_type: "",
  remarks: "",
});

export default function ConcreteTestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const taskId = Number(params.id);
  const shouldPrint = searchParams.get("print") === "true";

  const [user, setUser] = useState<User | null>(null);

  const [draftId, setDraftId] = useState<number | null>(null);

  const [reviewer, setReviewer] =
    useState<Reviewer | null>(null);

  const [reviewedAt, setReviewedAt] =
    useState<string | null>(null);

  const [testedByName, setTestedByName] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [samples, setSamples] = useState<Sample[]>(
    Array.from(
      { length: 12 },
      (_, i) => emptySample(i + 1)
    )
  );

  const [form, setForm] = useState({
    order_no: "",
    sample_code: "",
    sample_location: "",
    sampling_date: "",
    test_date: "",
    design_strength: "",
    cement_content: "",
    concrete_temperature: "",
    curing_temperature: "",
    protection_capping: "",
    specimen_type: "Cube",
    test_specification: "ASTM C39",
    tested_by: "",
    sampled_by: "",
    checked_by: "",
    notes: "",
  });

  // =========================================================
  // INITIALIZE
  // =========================================================

  useEffect(() => {
    const initialize = async () => {
      try {
        const savedUser =
          localStorage.getItem("user");

        let parsedUser: User | null = null;

        if (savedUser) {
          try {
            parsedUser = JSON.parse(savedUser);
          } catch (error) {
            console.error(
              "USER PARSE ERROR:",
              error
            );
          }
        }

        if (parsedUser) {
          setUser(parsedUser);

          setTestedByName(
            parsedUser.full_name ||
              parsedUser.username ||
              ""
          );

          setForm((prev) => ({
            ...prev,
            tested_by:
              parsedUser.id != null
                ? String(parsedUser.id)
                : "",
          }));
        }

        if (!Number.isNaN(taskId) && taskId > 0) {
          await loadDraft(parsedUser);
        }
      } catch (error) {
        console.error(
          "INITIALIZE ERROR:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [taskId]);

  // =========================================================
  // AUTO PRINT
  // =========================================================

  useEffect(() => {
    if (!loading && shouldPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [loading, shouldPrint]);

  // =========================================================
  // UPDATE FORM
  // =========================================================

  function updateField(
    field: string,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // =========================================================
  // UPDATE SAMPLE
  // =========================================================

  function updateSample(
    index: number,
    field: keyof Sample,
    value: string
  ) {
    setSamples((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      return updated;
    });
  }

  // =========================================================
  // CALCULATIONS
  // =========================================================

  function calculateArea(sample: Sample) {
    const length = Number(sample.length);
    const width = Number(sample.width);

    if (!length || !width) {
      return null;
    }

    if (form.specimen_type === "Cube") {
      return (length * width) / 100;
    }

    if (
      form.specimen_type === "Cylinder" ||
      form.specimen_type === "Concrete Core"
    ) {
      const diameter = width;

      return (
        (Math.PI * diameter * diameter) /
        4 /
        100
      );
    }

    return (length * width) / 100;
  }

  function calculateVolume(sample: Sample) {
    const length = Number(sample.length);
    const width = Number(sample.width);
    const height = Number(sample.height);

    if (!length || !width || !height) {
      return null;
    }

    return (
      (length * width * height) / 1000
    );
  }

  function calculateUnitWeight(sample: Sample) {
    const volume = calculateVolume(sample);
    const weight = Number(sample.weight);

    if (!volume || !weight) {
      return null;
    }

    return weight / volume;
  }

  function calculateLoadKg(sample: Sample) {
    const loadKn = Number(sample.load_kn);

    if (!loadKn) {
      return null;
    }

    return loadKn * 101.9716;
  }

  function calculateStrength(sample: Sample) {
    const area = calculateArea(sample);
    const loadKg = calculateLoadKg(sample);

    if (!area || !loadKg) {
      return null;
    }

    return loadKg / area;
  }

  // =========================================================
  // AVERAGE STRENGTH
  // =========================================================

  const averageStrength = useMemo(() => {
    const strengths = samples
      .map(calculateStrength)
      .filter(
        (
          value
        ): value is number =>
          value !== null &&
          Number.isFinite(value)
      );

    if (strengths.length === 0) {
      return null;
    }

    return (
      strengths.reduce(
        (sum, value) => sum + value,
        0
      ) / strengths.length
    );
  }, [samples, form.specimen_type]);

  // =========================================================
  // ACCEPTANCE
  // =========================================================

  const acceptanceStatus = useMemo(() => {
    if (averageStrength === null) {
      return "";
    }

    const designStrength =
      Number(form.design_strength);

    if (!designStrength) {
      return "";
    }

    return averageStrength >= designStrength
      ? "Accepted"
      : "Not Accepted";
  }, [
    averageStrength,
    form.design_strength,
  ]);

  // =========================================================
  // LOAD DRAFT
  // =========================================================

  async function loadDraft(
    currentUser: User | null
  ) {
    try {
      console.log(
        "🔎 Loading concrete test for task:",
        taskId
      );

      const {
        data: draft,
        error,
      } = await supabase
        .from("concrete_tests")
        .select(`
          *,
          tested_by_user:users!tested_by (
            id,
            full_name,
            username
          ),
          reviewed_by_user:users!reviewed_by (
            id,
            full_name,
            username
          )
        `)
        .eq("task_id", taskId)
        .order("id", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "LOAD CONCRETE TEST ERROR:",
          error
        );

        alert(
          "خطأ في تحميل نموذج الفحص:\n" +
            error.message
        );

        return;
      }

      console.log(
        "📋 CONCRETE TEST:",
        draft
      );

      // =====================================================
      // NO TEST
      // =====================================================

      if (!draft) {
        console.log(
          "No concrete test found for task"
        );

        if (currentUser?.id != null) {
          setForm((prev) => ({
            ...prev,
            tested_by: String(
              currentUser.id
            ),
          }));

          setTestedByName(
            currentUser.full_name ||
              currentUser.username ||
              ""
          );
        }

        return;
      }

      // =====================================================
      // TEST ID
      // =====================================================

      setDraftId(draft.id);

      // =====================================================
      // FORM
      // =====================================================

      const draftTestedById =
        draft.tested_by != null
          ? String(draft.tested_by)
          : "";

      setForm({
        order_no:
          draft.order_no || "",

        sample_code:
          draft.sample_code || "",

        sample_location:
          draft.sample_location || "",

        sampling_date:
          draft.sampling_date || "",

        test_date:
          draft.test_date || "",

        design_strength:
          draft.design_strength != null
            ? String(
                draft.design_strength
              )
            : "",

        cement_content:
          draft.cement_content != null
            ? String(
                draft.cement_content
              )
            : "",

        concrete_temperature:
          draft.concrete_temperature !=
          null
            ? String(
                draft.concrete_temperature
              )
            : "",

        curing_temperature:
          draft.curing_temperature !=
          null
            ? String(
                draft.curing_temperature
              )
            : "",

        protection_capping:
          draft.protection_capping || "",

        specimen_type:
          draft.specimen_type ||
          "Cube",

        test_specification:
          draft.test_specification ||
          "ASTM C39",

        tested_by:
          draftTestedById,

        sampled_by:
          draft.sampled_by || "",

        checked_by:
          draft.checked_by || "",

        notes:
          draft.notes || "",
      });

      // =====================================================
      // TESTED BY
      // =====================================================

      const testedUser =
        Array.isArray(
          draft.tested_by_user
        )
          ? draft.tested_by_user[0]
          : draft.tested_by_user;

      if (testedUser) {
        setTestedByName(
          testedUser.full_name ||
            testedUser.username ||
            ""
        );
      } else if (
        draftTestedById &&
        currentUser?.id != null &&
        Number(draftTestedById) ===
          Number(currentUser.id)
      ) {
        setTestedByName(
          currentUser.full_name ||
            currentUser.username ||
            ""
        );
      } else {
        setTestedByName("");
      }

      // =====================================================
      // REVIEWER
      // =====================================================

      const reviewedUser =
        Array.isArray(
          draft.reviewed_by_user
        )
          ? draft.reviewed_by_user[0]
          : draft.reviewed_by_user;

      if (reviewedUser) {
        setReviewer({
          id: Number(
            reviewedUser.id
          ),
          full_name:
            reviewedUser.full_name ||
            null,
          username:
            reviewedUser.username ||
            null,
        });
      } else {
        setReviewer(null);
      }

      setReviewedAt(
        draft.reviewed_at || null
      );

      // =====================================================
      // LOAD SAMPLE RESULTS
      // =====================================================

      const {
        data: results,
        error: resultsError,
      } = await supabase
        .from(
          "concrete_test_results"
        )
        .select("*")
        .eq("test_id", draft.id)
        .order("sample_no", {
          ascending: true,
        });

      if (resultsError) {
        console.error(
          "LOAD SAMPLE RESULTS ERROR:",
          resultsError
        );

        alert(
          "خطأ في تحميل نتائج العينات:\n" +
            resultsError.message
        );

        return;
      }

      console.log(
        "🧪 SAMPLE RESULTS:",
        results
      );

      if (
        results &&
        results.length > 0
      ) {
        const loadedSamples: Sample[] =
          Array.from(
            { length: 12 },
            (_, index) => {
              const sampleNo =
                index + 1;

              const result =
                results.find(
                  (item) =>
                    Number(
                      item.sample_no
                    ) === sampleNo
                );

              return {
                sample_no:
                  sampleNo,

                field_sample_no:
                  result?.field_sample_no ||
                  "",

                structure_part:
                  result?.structure_part ||
                  "",

                date_sampled:
                  result?.date_sampled ||
                  "",

                slump:
                  result?.slump != null
                    ? String(
                        result.slump
                      )
                    : "",

                age_days:
                  result?.age_days != null
                    ? String(
                        result.age_days
                      )
                    : "",

                length:
                  result?.length != null
                    ? String(
                        result.length
                      )
                    : "",

                width:
                  result?.width != null
                    ? String(
                        result.width
                      )
                    : "",

                height:
                  result?.height != null
                    ? String(
                        result.height
                      )
                    : "",

                weight:
                  result?.weight != null
                    ? String(
                        result.weight
                      )
                    : "",

                load_kn:
                  result?.load_kn != null
                    ? String(
                        result.load_kn
                      )
                    : "",

                break_type:
                  result?.break_type ||
                  "",

                remarks:
                  result?.remarks ||
                  "",
              };
            }
          );

        setSamples(
          loadedSamples
        );
      }
    } catch (error) {
      console.error(
        "LOAD DRAFT UNEXPECTED ERROR:",
        error
      );
    }
  }

  // =========================================================
  // SAVE TEST
  // =========================================================

  async function saveTest(): Promise<boolean> {
    if (!taskId || Number.isNaN(taskId)) {
      alert(
        "رقم المهمة غير صحيح"
      );

      return false;
    }

    setSaving(true);

    try {
      const testedById =
        user?.id != null
          ? Number(user.id)
          : form.tested_by
          ? Number(form.tested_by)
          : null;

      if (
        testedById !== null &&
        !Number.isFinite(
          testedById
        )
      ) {
        alert(
          "خطأ: رقم الفني غير صحيح."
        );

        return false;
      }

      const testValues = {
        task_id: taskId,

        order_no:
          form.order_no || null,

        sample_code:
          form.sample_code || null,

        sample_location:
          form.sample_location ||
          null,

        sampling_date:
          form.sampling_date ||
          null,

        test_date:
          form.test_date || null,

        design_strength:
          form.design_strength !== ""
            ? Number(
                form.design_strength
              )
            : null,

        cement_content:
          form.cement_content !== ""
            ? Number(
                form.cement_content
              )
            : null,

        concrete_temperature:
          form.concrete_temperature !==
          ""
            ? Number(
                form.concrete_temperature
              )
            : null,

        curing_temperature:
          form.curing_temperature !==
          ""
            ? Number(
                form.curing_temperature
              )
            : null,

        protection_capping:
          form.protection_capping ||
          null,

        specimen_type:
          form.specimen_type,

        test_specification:
          form.test_specification ||
          null,

        tested_by:
          testedById !== null
            ? testedById
            : null,

        sampled_by:
          form.sampled_by || null,

        checked_by:
          form.checked_by || null,

        notes:
          form.notes || null,

        average_strength:
          averageStrength !== null
            ? Number(
                averageStrength.toFixed(
                  2
                )
              )
            : null,

        acceptance_status:
          acceptanceStatus ||
          null,

        status: "Draft",
      };

      console.log(
        "💾 SAVING TEST:",
        testValues
      );

      let testData: any = null;
      let testError: any = null;

      // =====================================================
      // UPDATE
      // =====================================================

      if (draftId) {
        const result =
          await supabase
            .from(
              "concrete_tests"
            )
            .update(testValues)
            .eq("id", draftId)
            .select()
            .single();

        testData =
          result.data;

        testError =
          result.error;
      }

      // =====================================================
      // INSERT
      // =====================================================

      else {
        const result =
          await supabase
            .from(
              "concrete_tests"
            )
            .insert(testValues)
            .select()
            .single();

        testData =
          result.data;

        testError =
          result.error;

        if (testData) {
          setDraftId(
            testData.id
          );
        }
      }

      if (testError) {
        console.error(
          "SAVE TEST ERROR:",
          testError
        );

        alert(
          "خطأ في حفظ الفحص:\n" +
            testError.message
        );

        return false;
      }

      if (!testData) {
        alert(
          "لم يتم إنشاء نموذج الفحص"
        );

        return false;
      }

      // =====================================================
      // DELETE OLD RESULTS
      // =====================================================

      const {
        error:
          deleteResultsError,
      } = await supabase
        .from(
          "concrete_test_results"
        )
        .delete()
        .eq(
          "test_id",
          testData.id
        );

      if (deleteResultsError) {
        console.error(
          "DELETE RESULTS ERROR:",
          deleteResultsError
        );

        alert(
          "خطأ في حذف النتائج القديمة:\n" +
            deleteResultsError.message
        );

        return false;
      }

      // =====================================================
      // PREPARE RESULTS
      // =====================================================

      const sampleResults =
        samples.map(
          (sample) => {
            const area =
              calculateArea(
                sample
              );

            const volume =
              calculateVolume(
                sample
              );

            const unitWeight =
              calculateUnitWeight(
                sample
              );

            const loadKg =
              calculateLoadKg(
                sample
              );

            const strength =
              calculateStrength(
                sample
              );

            return {
              test_id:
                testData.id,

              sample_no:
                sample.sample_no,

              field_sample_no:
                sample.field_sample_no ||
                null,

              structure_part:
                sample.structure_part ||
                null,

              date_sampled:
                sample.date_sampled ||
                null,

              slump:
                sample.slump !== ""
                  ? Number(
                      sample.slump
                    )
                  : null,

              age_days:
                sample.age_days !== ""
                  ? Number(
                      sample.age_days
                    )
                  : null,

              length:
                sample.length !== ""
                  ? Number(
                      sample.length
                    )
                  : null,

              width:
                sample.width !== ""
                  ? Number(
                      sample.width
                    )
                  : null,

              height:
                sample.height !== ""
                  ? Number(
                      sample.height
                    )
                  : null,

              area:
                area !== null
                  ? Number(
                      area.toFixed(
                        2
                      )
                    )
                  : null,

              volume:
                volume !== null
                  ? Number(
                      volume.toFixed(
                        2
                      )
                    )
                  : null,

              weight:
                sample.weight !== ""
                  ? Number(
                      sample.weight
                    )
                  : null,

              unit_weight:
                unitWeight !== null
                  ? Number(
                      unitWeight.toFixed(
                        3
                      )
                    )
                  : null,

              load_kn:
                sample.load_kn !== ""
                  ? Number(
                      sample.load_kn
                    )
                  : null,

              load_kg:
                loadKg !== null
                  ? Number(
                      loadKg.toFixed(
                        1
                      )
                    )
                  : null,

              strength:
                strength !== null
                  ? Number(
                      strength.toFixed(
                        1
                      )
                    )
                  : null,

              break_type:
                sample.break_type ||
                null,

              remarks:
                sample.remarks ||
                null,
            };
          }
        );

      // =====================================================
      // INSERT RESULTS
      // =====================================================

      const {
        error:
          insertResultsError,
      } = await supabase
        .from(
          "concrete_test_results"
        )
        .insert(
          sampleResults
        );

      if (
        insertResultsError
      ) {
        console.error(
          "INSERT SAMPLE RESULTS ERROR:",
          insertResultsError
        );

        alert(
          "خطأ في حفظ نتائج العينات:\n" +
            insertResultsError.message
        );

        return false;
      }

      alert(
        "تم حفظ المسودة بنجاح ✅"
      );

      return true;
    } catch (error: any) {
      console.error(
        "UNEXPECTED SAVE ERROR:",
        error
      );

      alert(
        "حدث خطأ غير متوقع:\n" +
          (
            error?.message ||
            "خطأ غير معروف"
          )
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // PRINT
  // =========================================================

  function printReport() {
    window.print();
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <button
            onClick={() =>
              router.back()
            }
            className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg mb-4"
          >
            ← رجوع
          </button>

          <div>
            جاري تحميل نموذج الفحص...
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <ProtectedRoute>
      <div
        className={
          shouldPrint
            ? "min-h-screen bg-white p-0"
            : "min-h-screen bg-gray-100 p-4 md:p-6"
        }
      >

        {/* =================================================
            CONTROL BUTTONS
        ================================================= */}

        <div className="flex flex-wrap gap-3 mb-4 print:hidden">

          <button
            onClick={() =>
              router.back()
            }
            className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg"
          >
            ← رجوع
          </button>

          <button
            onClick={saveTest}
            disabled={saving}
            className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg"
          >
            {saving
              ? "جاري الحفظ..."
              : "💾 حفظ المسودة"}
          </button>

          <button
            onClick={async () => {
              const success =
                await saveTest();

              if (success) {
                router.back();
              }
            }}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg"
          >
            💾 حفظ المسودة والخروج
          </button>

          <button
            onClick={
              printReport
            }
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg"
          >
            🖨️ طباعة التقرير
          </button>

        </div>

        {/* =================================================
            REPORT
        ================================================= */}

        <div
          className={
            shouldPrint
              ? "bg-white p-0 shadow-none print:shadow-none"
              : "bg-white p-4 md:p-6 shadow-sm print:shadow-none"
          }
        >

          <ReportHeader />

          {/* TITLE */}

          <div className="border border-black mt-4">

            <div className="text-center font-bold text-lg p-3 border-b border-black">
              WORKSHEET FOR COMPRESSIVE STRENGTH OF CONCRETE / MORTAR SAMPLES
            </div>

            <div className="text-center font-bold text-lg p-2">
              نموذج فحص قوة عينات الخرسانة الأسمنتية
            </div>

          </div>

          {/* FORM DATA */}

          <div className="border-l border-r border-b border-black">

            <div className="grid grid-cols-2">

              <Field
                label="Sampling Date / تاريخ أخذ العينة"
                value={
                  form.sampling_date
                }
                type="date"
                readOnly={
                  shouldPrint
                }
                onChange={(value) =>
                  updateField(
                    "sampling_date",
                    value
                  )
                }
              />

              {/* TESTED BY */}

              <div className="border-t border-black p-2">

                <div className="font-bold text-xs mb-1">
                  Tested By / الفاحص
                </div>

                <input
                  type="text"
                  className="w-full border p-2 bg-gray-100"
                  value={
                    testedByName
                  }
                  readOnly
                />

              </div>

              <Field
                label="Strength Specified / Design Strength (Kg/cm²) / المقاومة التصميمية"
                value={
                  form.design_strength
                }
                type="number"
                readOnly={
                  shouldPrint
                }
                onChange={(value) =>
                  updateField(
                    "design_strength",
                    value
                  )
                }
              />

              <Field
                label="Sampled By / أخذ العينة بواسطة"
                value={
                  form.sampled_by
                }
                readOnly={
                  shouldPrint
                }
                onChange={(value) =>
                  updateField(
                    "sampled_by",
                    value
                  )
                }
              />

              <Field
                label="Cement Content (Kg/m³ - Portland) / محتوى الأسمنت"
                value={
                  form.cement_content
                }
                type="number"
                readOnly={
                  shouldPrint
                }
                onChange={(value) =>
                  updateField(
                    "cement_content",
                    value
                  )
                }
              />

              <Field
                label="Concrete Temperature (°C) / درجة حرارة الخرسانة"
                value={
                  form.concrete_temperature
                }
                type="number"
                readOnly={
                  shouldPrint
                }
                onChange={(value) =>
                  updateField(
                    "concrete_temperature",
                    value
                  )
                }
              />

              <Field
                label="Protection & Capping or No / الحماية والتغطية"
                value={
                  form.protection_capping
                }
                readOnly={
                  shouldPrint
                }
                onChange={(value) =>
                  updateField(
                    "protection_capping",
                    value
                  )
                }
              />

              <Field
                label="Curing Temperature (°C) / درجة حرارة المعالجة"
                value={
                  form.curing_temperature
                }
                type="number"
                readOnly={
                  shouldPrint
                }
                onChange={(value) =>
                  updateField(
                    "curing_temperature",
                    value
                  )
                }
              />

              {/* SPECIMEN TYPE */}

              <div className="border-t border-black p-2">

                <div className="font-bold text-xs mb-2">
                  Specimens Desc. / Type
                  <br />
                  وصف / نوع العينة
                </div>

                <select
                  className="w-full border p-2"
                  value={
                    form.specimen_type
                  }
                  disabled={
                    shouldPrint
                  }
                  onChange={(e) =>
                    updateField(
                      "specimen_type",
                      e.target.value
                    )
                  }
                >
                  <option value="Cube">
                    CUBE / مكعب
                  </option>

                  <option value="Cylinder">
                    CYLINDER / أسطوانة
                  </option>

                  <option value="Concrete Core">
                    CONCRETE CORE / لبّة خرسانية
                  </option>
                </select>

              </div>

              <Field
                label="Test Specification / مواصفة الاختبار"
                value={
                  form.test_specification
                }
                readOnly={
                  shouldPrint
                }
                onChange={(value) =>
                  updateField(
                    "test_specification",
                    value
                  )
                }
              />

            </div>

          </div>

          {/* =================================================
              RESULTS TABLE
          ================================================= */}

          <div className="overflow-x-auto mt-5">

            <table className="w-full border-collapse border border-black text-[10px]">

              <thead>

                <tr className="bg-gray-200">

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Test No.
                    <br />
                    <span dir="rtl">
                      رقم العينة
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Field Sample No.
                    <br />
                    <span dir="rtl">
                      رقم العينة في الحقل
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2 min-w-[150px]"
                  >
                    Part of Structure or Station Represented
                    <br />
                    <span dir="rtl">
                      أي جزء من الإنشاء تمثله
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Date Sampled
                    <br />
                    <span dir="rtl">
                      تاريخ أخذ العينة
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    SLUMP
                    <br />
                    (mm)
                    <br />
                    <span dir="rtl">
                      الهبوط
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Age
                    <br />
                    (Days)
                    <br />
                    <span dir="rtl">
                      عمر العينة بالأيام
                    </span>
                  </th>

                  <th
                    colSpan={3}
                    className="border border-black p-2"
                  >
                    Sample Dimensions
                    <br />
                    (mm)
                    <br />
                    <span dir="rtl">
                      أبعاد العينة (مليمتر)
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    X-Sectional
                    <br />
                    Area cm²
                    <br />
                    <span dir="rtl">
                      المساحة سم²
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Volume
                    <br />
                    cm³
                    <br />
                    <span dir="rtl">
                      الحجم سم³
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Weight
                    <br />
                    g
                    <br />
                    <span dir="rtl">
                      الوزن غم
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Unit Wt
                    <br />
                    g/cm³
                    <br />
                    <span dir="rtl">
                      الوزن النوعي
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Total Load
                    <br />
                    KN
                    <br />
                    <span dir="rtl">
                      التحميل الكلي KN
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Total Load
                    <br />
                    Kg
                    <br />
                    <span dir="rtl">
                      التحميل الكلي كغم
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2"
                  >
                    Unit Strength
                    <br />
                    Kg/cm²
                    <br />
                    <span dir="rtl">
                      وحدة القوة كغم/سم²
                    </span>
                  </th>

                  <th
                    rowSpan={2}
                    className="border border-black p-2 min-w-[120px]"
                  >
                    Type of Break
                    <br />
                    Remarks
                    <br />
                    <span dir="rtl">
                      نوع الكسر والملاحظات
                    </span>
                  </th>

                </tr>

                <tr className="bg-gray-200">

                  <th className="border border-black p-1">
                    L
                  </th>

                  <th className="border border-black p-1">
                    W
                  </th>

                  <th className="border border-black p-1">
                    H
                  </th>

                </tr>

              </thead>

              <tbody>

                {samples.map(
                  (
                    sample,
                    index
                  ) => {

                    const area =
                      calculateArea(
                        sample
                      );

                    const volume =
                      calculateVolume(
                        sample
                      );

                    const unitWeight =
                      calculateUnitWeight(
                        sample
                      );

                    const loadKg =
                      calculateLoadKg(
                        sample
                      );

                    const strength =
                      calculateStrength(
                        sample
                      );

                    return (
                      <tr
                        key={
                          sample.sample_no
                        }
                      >

                        <td className="border border-black p-1 text-center font-bold">
                          {
                            sample.sample_no
                          }
                        </td>

                        <td className="border border-black p-1">

                          <input
                            className="w-full min-w-[70px] p-1 border"
                            value={
                              sample.field_sample_no
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "field_sample_no",
                                e.target.value
                              )
                            }
                          />

                        </td>

                        <td className="border border-black p-1">

                          <input
                            className="w-full min-w-[130px] p-1 border"
                            value={
                              sample.structure_part
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "structure_part",
                                e.target.value
                              )
                            }
                          />

                        </td>

                        <td className="border border-black p-1">

                          <input
                            type="date"
                            className="w-full min-w-[110px] p-1 border"
                            value={
                              sample.date_sampled
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "date_sampled",
                                e.target.value
                              )
                            }
                          />

                        </td>

                        <td className="border border-black p-1">

                          <input
                            type="number"
                            className="w-full min-w-[55px] p-1 border"
                            value={
                              sample.slump
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "slump",
                                e.target.value
                              )
                            }
                          />

                        </td>

                        <td className="border border-black p-1">

                          <input
                            type="number"
                            className="w-full min-w-[50px] p-1 border"
                            value={
                              sample.age_days
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "age_days",
                                e.target.value
                              )
                            }
                          />

                        </td>

                        <DimensionInput
                          value={
                            sample.length
                          }
                          readOnly={
                            shouldPrint
                          }
                          onChange={(
                            value
                          ) =>
                            updateSample(
                              index,
                              "length",
                              value
                            )
                          }
                        />

                        <DimensionInput
                          value={
                            sample.width
                          }
                          readOnly={
                            shouldPrint
                          }
                          onChange={(
                            value
                          ) =>
                            updateSample(
                              index,
                              "width",
                              value
                            )
                          }
                        />

                        <DimensionInput
                          value={
                            sample.height
                          }
                          readOnly={
                            shouldPrint
                          }
                          onChange={(
                            value
                          ) =>
                            updateSample(
                              index,
                              "height",
                              value
                            )
                          }
                        />

                        <td className="border border-black p-1 text-center bg-gray-50">
                          {area !== null
                            ? area.toFixed(
                                2
                              )
                            : ""}
                        </td>

                        <td className="border border-black p-1 text-center bg-gray-50">
                          {volume !== null
                            ? volume.toFixed(
                                2
                              )
                            : ""}
                        </td>

                        <td className="border border-black p-1">

                          <input
                            type="number"
                            className="w-full min-w-[65px] p-1 border"
                            value={
                              sample.weight
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "weight",
                                e.target.value
                              )
                            }
                          />

                        </td>

                        <td className="border border-black p-1 text-center bg-gray-50">
                          {unitWeight !==
                          null
                            ? unitWeight.toFixed(
                                3
                              )
                            : ""}
                        </td>

                        <td className="border border-black p-1">

                          <input
                            type="number"
                            step="0.1"
                            className="w-full min-w-[70px] p-1 border"
                            value={
                              sample.load_kn
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "load_kn",
                                e.target.value
                              )
                            }
                          />

                        </td>

                        <td className="border border-black p-1 text-center bg-gray-50">
                          {loadKg !== null
                            ? loadKg.toFixed(
                                0
                              )
                            : ""}
                        </td>

                        <td className="border border-black p-1 text-center bg-gray-50 font-semibold">
                          {strength !==
                          null
                            ? strength.toFixed(
                                1
                              )
                            : ""}
                        </td>

                        <td className="border border-black p-1">

                          <input
                            placeholder="Break / نوع الكسر"
                            className="w-full p-1 border mb-1"
                            value={
                              sample.break_type
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "break_type",
                                e.target.value
                              )
                            }
                          />

                          <input
                            placeholder="Remarks / ملاحظات"
                            className="w-full p-1 border"
                            value={
                              sample.remarks
                            }
                            readOnly={
                              shouldPrint
                            }
                            onChange={(
                              e
                            ) =>
                              updateSample(
                                index,
                                "remarks",
                                e.target.value
                              )
                            }
                          />

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

          {/* =================================================
              FINAL RESULTS
          ================================================= */}

          <div className="mt-4 border border-black">

            <div className="grid md:grid-cols-3">

              {/* AVG */}

              <div className="border-b md:border-b-0 md:border-r border-black p-3">

                <strong>
                  AVG / المتوسط
                </strong>

                <div className="text-xl font-bold mt-1">
                  {averageStrength !==
                  null
                    ? averageStrength.toFixed(
                        1
                      )
                    : "-"}
                </div>

              </div>

              {/* TESTED BY */}

              <div className="border-b md:border-b-0 md:border-r border-black p-3">

                <strong>
                  Tested By (L.T) / الفاحص
                </strong>

                <input
                  type="text"
                  className="w-full border p-2 mt-2 bg-gray-100"
                  value={
                    testedByName
                  }
                  readOnly
                />

              </div>

              {/* NOTES */}

              <div className="p-3">

                <strong>
                  Notes / الملاحظات
                </strong>

                <textarea
                  className="w-full border p-2 mt-2"
                  value={
                    form.notes
                  }
                  readOnly={
                    shouldPrint
                  }
                  onChange={(e) =>
                    updateField(
                      "notes",
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

          </div>

          {/* =================================================
              REVIEW INFORMATION
          ================================================= */}

          {reviewer && (
            <div className="mt-4 border border-black">

              <div className="grid md:grid-cols-2">

                <div className="p-3 border-b md:border-b-0 md:border-r border-black">

                  <strong>
                    Reviewed By / تمت المراجعة بواسطة
                  </strong>

                  <div className="mt-2">
                    {reviewer.full_name ||
                      reviewer.username ||
                      "-"}
                  </div>

                </div>

                <div className="p-3">

                  <strong>
                    Reviewed At / تاريخ المراجعة
                  </strong>

                  <div className="mt-2">
                    {reviewedAt
                      ? new Date(
                          reviewedAt
                        ).toLocaleString(
                          "ar-SA",
                          {
                            timeZone:
                              "Asia/Riyadh",
                          }
                        )
                      : "-"}
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              ACCEPTANCE
          ================================================= */}

          {acceptanceStatus && (
            <div
              className={`mt-4 border border-black p-3 text-center font-bold ${
                acceptanceStatus ===
                "Accepted"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              Acceptance Status / حالة القبول:
              {" "}
              {acceptanceStatus}
            </div>
          )}

        </div>

      </div>
    </ProtectedRoute>
  );
}

/* =========================================================
   FIELD COMPONENT
========================================================= */

function Field({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="border-t border-black p-2">

      <div className="font-bold text-xs mb-1">
        {label}
      </div>

      <input
        type={type}
        className="w-full border p-2"
        value={value}
        readOnly={readOnly}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      />

    </div>
  );
}

/* =========================================================
   DIMENSION INPUT
========================================================= */

function DimensionInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
  readOnly?: boolean;
}) {
  return (
    <td className="border border-black p-1">

      <input
        type="number"
        className="w-full min-w-[50px] p-1 border"
        value={value}
        readOnly={readOnly}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      />

    </td>
  );
}
