"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReportHeader from "@/components/reports/ReportHeader";

type User = {
  id: number;
  username?: string | null;
  full_name?: string | null;
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

  const taskId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);

  // اسم الفني للعرض فقط
  const [testedByName, setTestedByName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [samples, setSamples] = useState<Sample[]>(
    Array.from({ length: 12 }, (_, i) => emptySample(i + 1))
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

    // هذا يبقى ID فقط وليس اسم
    tested_by: "",

    sampled_by: "",
    checked_by: "",
    notes: "",
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        const savedUser = localStorage.getItem("user");

        let parsedUser: User | null = null;

        if (savedUser) {
          try {
            parsedUser = JSON.parse(savedUser);
          } catch (error) {
            console.error("USER PARSE ERROR:", error);
          }
        }

        if (parsedUser) {
          setUser(parsedUser);

          // الفني الحالي هو الافتراضي
          setTestedByName(
            parsedUser.full_name ||
              parsedUser.username ||
              ""
          );

          setForm((prev) => ({
            ...prev,
            tested_by:
              parsedUser?.id != null
                ? String(parsedUser.id)
                : "",
          }));
        }

        if (!Number.isNaN(taskId)) {
          await loadDraft(parsedUser);
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [taskId]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

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

  function calculateArea(sample: Sample) {
    const length = Number(sample.length);
    const width = Number(sample.width);

    if (!length || !width) return null;

    return (length * width) / 100;
  }

  function calculateVolume(sample: Sample) {
    const length = Number(sample.length);
    const width = Number(sample.width);
    const height = Number(sample.height);

    if (!length || !width || !height) return null;

    return (length * width * height) / 1000;
  }

  function calculateUnitWeight(sample: Sample) {
    const volume = calculateVolume(sample);
    const weight = Number(sample.weight);

    if (!volume || !weight) return null;

    return weight / volume;
  }

  function calculateLoadKg(sample: Sample) {
    const loadKn = Number(sample.load_kn);

    if (!loadKn) return null;

    return loadKn * 101.9716;
  }

  function calculateStrength(sample: Sample) {
    const area = calculateArea(sample);
    const loadKg = calculateLoadKg(sample);

    if (!area || !loadKg) return null;

    return loadKg / area;
  }

  const averageStrength = useMemo(() => {
    const strengths = samples
      .map(calculateStrength)
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value)
      );

    if (strengths.length === 0) return null;

    return (
      strengths.reduce((sum, value) => sum + value, 0) /
      strengths.length
    );
  }, [samples]);

  const acceptanceStatus = useMemo(() => {
    if (averageStrength === null) return "";

    const designStrength = Number(form.design_strength);

    if (!designStrength) return "";

    return averageStrength >= designStrength
      ? "Accepted"
      : "Not Accepted";
  }, [averageStrength, form.design_strength]);

  async function loadDraft(currentUser: User | null) {
    try {
      const { data: draft, error } = await supabase
        .from("concrete_tests")
        .select(`
          *,
          tested_by_user:users!tested_by (
            id,
            full_name,
            username
          )
        `)
        .eq("task_id", taskId)
        .eq("status", "Draft")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("DRAFT ERROR:", error);
        alert(error.message);
        return;
      }

      if (!draft) {
        console.log("No draft found");

        // لا يوجد Draft، استخدم الفني الحالي
        if (currentUser?.id != null) {
          setForm((prev) => ({
            ...prev,
            tested_by: String(currentUser.id),
          }));

          setTestedByName(
            currentUser.full_name ||
              currentUser.username ||
              ""
          );
        }

        return;
      }

      setDraftId(draft.id);

      // -----------------------------------------
      // tested_by = ID فقط
      // -----------------------------------------

      const draftTestedById =
        draft.tested_by != null
          ? String(draft.tested_by)
          : "";

      setForm({
        order_no: draft.order_no || "",
        sample_code: draft.sample_code || "",
        sample_location: draft.sample_location || "",
        sampling_date: draft.sampling_date || "",
        test_date: draft.test_date || "",
        design_strength:
          draft.design_strength?.toString() || "",
        cement_content:
          draft.cement_content?.toString() || "",
        concrete_temperature:
          draft.concrete_temperature?.toString() || "",
        curing_temperature:
          draft.curing_temperature?.toString() || "",
        protection_capping:
          draft.protection_capping || "",
        specimen_type:
          draft.specimen_type || "Cube",
        test_specification:
          draft.test_specification || "ASTM C39",

        // مهم جدًا:
        // لا نحط اسم الفني هنا
        tested_by: draftTestedById,

        sampled_by: draft.sampled_by || "",
        checked_by: draft.checked_by || "",
        notes: draft.notes || "",
      });

      // -----------------------------------------
      // اسم الفني للعرض فقط
      // -----------------------------------------

      const testedUser = Array.isArray(draft.tested_by_user)
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
        Number(draftTestedById) === Number(currentUser.id)
      ) {
        setTestedByName(
          currentUser.full_name ||
            currentUser.username ||
            ""
        );
      } else {
        setTestedByName("");
      }

      // -----------------------------------------
      // تحميل نتائج العينات
      // -----------------------------------------

      const {
        data: results,
        error: resultsError,
      } = await supabase
        .from("concrete_test_results")
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

      if (results && results.length > 0) {
        const loadedSamples: Sample[] =
          Array.from(
            { length: 12 },
            (_, index) => {
              const sampleNo = index + 1;

              const result = results.find(
                (item) =>
                  Number(item.sample_no) ===
                  sampleNo
              );

              return {
                sample_no: sampleNo,

                field_sample_no:
                  result?.field_sample_no || "",

                structure_part:
                  result?.structure_part || "",

                date_sampled:
                  result?.date_sampled || "",

                slump:
                  result?.slump != null
                    ? String(result.slump)
                    : "",

                age_days:
                  result?.age_days != null
                    ? String(result.age_days)
                    : "",

                length:
                  result?.length != null
                    ? String(result.length)
                    : "",

                width:
                  result?.width != null
                    ? String(result.width)
                    : "",

                height:
                  result?.height != null
                    ? String(result.height)
                    : "",

                weight:
                  result?.weight != null
                    ? String(result.weight)
                    : "",

                load_kn:
                  result?.load_kn != null
                    ? String(result.load_kn)
                    : "",

                break_type:
                  result?.break_type || "",

                remarks:
                  result?.remarks || "",
              };
            }
          );

        setSamples(loadedSamples);
      }
    } catch (error) {
      console.error("LOAD DRAFT UNEXPECTED ERROR:", error);
    }
  }

  async function saveTest(): Promise<boolean> {
    if (!taskId) {
      alert("رقم المهمة غير صحيح");
      return false;
    }

    setSaving(true);

    try {
      // -----------------------------------------
      // تحديد ID الفني فقط
      // -----------------------------------------

      const testedById =
        user?.id != null
          ? Number(user.id)
          : form.tested_by
          ? Number(form.tested_by)
          : null;

      console.log("CURRENT USER:", user);
      console.log("TESTED BY ID:", testedById);
      console.log("TESTED BY NAME:", testedByName);

      // حماية إضافية:
      // إذا كانت القيمة ليست رقمًا، لا نرسلها
      if (
        testedById !== null &&
        !Number.isFinite(testedById)
      ) {
        console.error(
          "INVALID TESTED BY:",
          testedById
        );

        alert(
          "خطأ: رقم الفني غير صحيح. لم يتم الحفظ."
        );

        return false;
      }

      const testValues = {
        task_id: taskId,

        order_no: form.order_no || null,

        sample_code: form.sample_code || null,

        sample_location:
          form.sample_location || null,

        sampling_date:
          form.sampling_date || null,

        test_date:
          form.test_date || null,

        design_strength:
          Number(form.design_strength) || null,

        cement_content:
          Number(form.cement_content) || null,

        concrete_temperature:
          Number(form.concrete_temperature) || null,

        curing_temperature:
          Number(form.curing_temperature) || null,

        protection_capping:
          form.protection_capping || null,

        specimen_type:
          form.specimen_type,

        test_specification:
          form.test_specification || null,

        // =====================================
        // أهم سطر في الملف كله
        // قاعدة البيانات تريد bigint
        // لذلك نحفظ ID الفني فقط
        // =====================================
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
                averageStrength.toFixed(2)
              )
            : null,

        acceptance_status:
          acceptanceStatus || null,

        status: "Draft",
      };

      console.log(
        "TEST VALUES:",
        testValues
      );

      let testData: any = null;
      let testError: any = null;

      // -----------------------------------------
      // تحديث Draft موجود
      // -----------------------------------------

      if (draftId) {
        const result = await supabase
          .from("concrete_tests")
          .update(testValues)
          .eq("id", draftId)
          .select()
          .single();

        testData = result.data;
        testError = result.error;
      }

      // -----------------------------------------
      // إنشاء Draft جديد
      // -----------------------------------------

      else {
        const result = await supabase
          .from("concrete_tests")
          .insert(testValues)
          .select()
          .single();

        testData = result.data;
        testError = result.error;

        if (testData) {
          setDraftId(testData.id);
        }
      }

      if (testError) {
        console.error(
          "SAVE TEST ERROR:",
          JSON.stringify(
            testError,
            null,
            2
          )
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

      // -----------------------------------------
      // حذف النتائج القديمة
      // -----------------------------------------

      const {
        error: deleteResultsError,
      } = await supabase
        .from("concrete_test_results")
        .delete()
        .eq("test_id", testData.id);

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

      // -----------------------------------------
      // تجهيز نتائج العينات
      // -----------------------------------------

      const sampleResults = samples.map(
        (sample) => {
          const area =
            calculateArea(sample);

          const volume =
            calculateVolume(sample);

          const unitWeight =
            calculateUnitWeight(sample);

          const loadKg =
            calculateLoadKg(sample);

          const strength =
            calculateStrength(sample);

          return {
            test_id: testData.id,

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
              Number(sample.slump) ||
              null,

            age_days:
              Number(sample.age_days) ||
              null,

            length:
              Number(sample.length) ||
              null,

            width:
              Number(sample.width) ||
              null,

            height:
              Number(sample.height) ||
              null,

            area:
              area !== null
                ? Number(
                    area.toFixed(2)
                  )
                : null,

            volume:
              volume !== null
                ? Number(
                    volume.toFixed(2)
                  )
                : null,

            weight:
              Number(sample.weight) ||
              null,

            unit_weight:
              unitWeight !== null
                ? Number(
                    unitWeight.toFixed(3)
                  )
                : null,

            load_kn:
              Number(sample.load_kn) ||
              null,

            load_kg:
              loadKg !== null
                ? Number(
                    loadKg.toFixed(1)
                  )
                : null,

            strength:
              strength !== null
                ? Number(
                    strength.toFixed(1)
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

      // -----------------------------------------
      // حفظ نتائج العينات
      // -----------------------------------------

      const {
        error: insertResultsError,
      } = await supabase
        .from("concrete_test_results")
        .insert(sampleResults);

      if (insertResultsError) {
        console.error(
          "INSERT SAMPLE RESULTS ERROR:",
          JSON.stringify(
            insertResultsError,
            null,
            2
          )
        );

        alert(
          "خطأ في حفظ نتائج العينات:\n" +
            insertResultsError.message
        );

        return false;
      }

      alert(
        "تم حفظ المسودة بنجاح"
      );

      return true;
    } catch (error: any) {
      console.error(
        "UNEXPECTED SAVE ERROR:",
        error
      );

      alert(
        "حدث خطأ غير متوقع:\n" +
          (error?.message ||
            "خطأ غير معروف")
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  function printReport() {
    window.print();
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <button
  onClick={() => router.back()}
  className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg mb-4"
>
  ← رجوع
</button>
          جاري تحميل نموذج الفحص...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">

        {/* التحكم */}
        <div className="flex flex-wrap gap-3 mb-4 print:hidden">

          <button
            onClick={() => router.back()}
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
            onClick={printReport}
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg"
          >
            🖨️ طباعة التقرير
          </button>

        </div>

        {/* التقرير */}
        <div className="bg-white p-4 md:p-6 shadow-sm print:shadow-none">

          <ReportHeader />

          {/* العنوان */}
          <div className="border border-black mt-4">

            <div className="text-center font-bold text-lg p-3 border-b border-black">
              WORKSHEET FOR COMPRESSIVE STRENGTH OF CONCRETE / MORTAR SAMPLES
            </div>

            <div className="text-center font-bold text-lg p-2">
              نموذج فحص قوة عينات الخرسانة الأسمنتية
            </div>

          </div>

          {/* بيانات النموذج */}
          <div className="border-l border-r border-b border-black">

            <div className="grid grid-cols-2">

              <Field
                label="Sampling Date"
                value={form.sampling_date}
                type="date"
                onChange={(v) =>
                  updateField(
                    "sampling_date",
                    v
                  )
                }
              />

              <Field
                label="Date Tested"
                value={form.test_date}
                type="date"
                onChange={(v) =>
                  updateField(
                    "test_date",
                    v
                  )
                }
              />

              <Field
                label="Order No."
                value={form.order_no}
                onChange={(v) =>
                  updateField(
                    "order_no",
                    v
                  )
                }
              />

              <Field
                label="Sample Code"
                value={form.sample_code}
                onChange={(v) =>
                  updateField(
                    "sample_code",
                    v
                  )
                }
              />

              <Field
                label="Sample Location"
                value={form.sample_location}
                onChange={(v) =>
                  updateField(
                    "sample_location",
                    v
                  )
                }
              />

              {/* ================================= */}
              {/* Tested By */}
              {/* الاسم فقط للعرض */}
              {/* ================================= */}

              <div className="border-t border-black p-2">
                <div className="font-bold text-xs mb-1">
                  Tested By
                </div>

                <input
                  type="text"
                  className="w-full border p-2 bg-gray-100"
                  value={testedByName}
                  readOnly
                />
              </div>

              <Field
                label="Strength Specified / Design Strength (Kg/cm²)"
                value={form.design_strength}
                type="number"
                onChange={(v) =>
                  updateField(
                    "design_strength",
                    v
                  )
                }
              />

              <Field
                label="Sampled By"
                value={form.sampled_by}
                onChange={(v) =>
                  updateField(
                    "sampled_by",
                    v
                  )
                }
              />

              <Field
                label="Cement Content (Kg/m³ - Portland)"
                value={form.cement_content}
                type="number"
                onChange={(v) =>
                  updateField(
                    "cement_content",
                    v
                  )
                }
              />

              <Field
                label="Concrete Temperature (°C)"
                value={
                  form.concrete_temperature
                }
                type="number"
                onChange={(v) =>
                  updateField(
                    "concrete_temperature",
                    v
                  )
                }
              />

              <Field
                label="Protection & Capping or No"
                value={
                  form.protection_capping
                }
                onChange={(v) =>
                  updateField(
                    "protection_capping",
                    v
                  )
                }
              />

              <Field
                label="Curing Temperature (°C)"
                value={
                  form.curing_temperature
                }
                type="number"
                onChange={(v) =>
                  updateField(
                    "curing_temperature",
                    v
                  )
                }
              />

              <div className="border-t border-black p-2">

                <div className="font-bold text-xs mb-2">
                  Specimens Desc. / Type
                </div>

                <select
                  className="w-full border p-2"
                  value={form.specimen_type}
                  onChange={(e) =>
                    updateField(
                      "specimen_type",
                      e.target.value
                    )
                  }
                >
                  <option value="Cube">
                    CUBE
                  </option>

                  <option value="Cylinder">
                    CYLINDER
                  </option>

                  <option value="Concrete Core">
                    Concrete Cores
                  </option>
                </select>

              </div>

              <Field
                label="Test Specification"
                value={
                  form.test_specification
                }
                onChange={(v) =>
                  updateField(
                    "test_specification",
                    v
                  )
                }
              />

            </div>

          </div>

          {/* الجدول */}
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
                  (sample, index) => {
                    const area =
                      calculateArea(sample);

                    const volume =
                      calculateVolume(sample);

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
                          {sample.sample_no}
                        </td>

                        <td className="border border-black p-1">
                          <input
                            className="w-full min-w-[70px] p-1 border"
                            value={
                              sample.field_sample_no
                            }
                            onChange={(e) =>
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
                            onChange={(e) =>
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
                            onChange={(e) =>
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
                            onChange={(e) =>
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
                            onChange={(e) =>
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
                          onChange={(v) =>
                            updateSample(
                              index,
                              "length",
                              v
                            )
                          }
                        />

                        <DimensionInput
                          value={
                            sample.width
                          }
                          onChange={(v) =>
                            updateSample(
                              index,
                              "width",
                              v
                            )
                          }
                        />

                        <DimensionInput
                          value={
                            sample.height
                          }
                          onChange={(v) =>
                            updateSample(
                              index,
                              "height",
                              v
                            )
                          }
                        />

                        <td className="border border-black p-1 text-center bg-gray-50">
                          {area !== null
                            ? area.toFixed(2)
                            : ""}
                        </td>

                        <td className="border border-black p-1 text-center bg-gray-50">
                          {volume !== null
                            ? volume.toFixed(2)
                            : ""}
                        </td>

                        <td className="border border-black p-1">
                          <input
                            type="number"
                            className="w-full min-w-[65px] p-1 border"
                            value={
                              sample.weight
                            }
                            onChange={(e) =>
                              updateSample(
                                index,
                                "weight",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="border border-black p-1 text-center bg-gray-50">
                          {unitWeight !== null
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
                            onChange={(e) =>
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
                          {strength !== null
                            ? strength.toFixed(
                                1
                              )
                            : ""}
                        </td>

                        <td className="border border-black p-1">

                          <input
                            placeholder="Break"
                            className="w-full p-1 border mb-1"
                            value={
                              sample.break_type
                            }
                            onChange={(e) =>
                              updateSample(
                                index,
                                "break_type",
                                e.target.value
                              )
                            }
                          />

                          <input
                            placeholder="Remarks"
                            className="w-full p-1 border"
                            value={
                              sample.remarks
                            }
                            onChange={(e) =>
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

          {/* النتائج النهائية */}
          <div className="mt-4 border border-black">

            <div className="grid md:grid-cols-5">

              <div className="border-b md:border-b-0 md:border-r border-black p-3">
                <strong>
                  AVG
                </strong>

                <div className="text-xl font-bold mt-1">
                  {averageStrength !== null
                    ? averageStrength.toFixed(
                        1
                      )
                    : "-"}
                </div>
              </div>

              <div className="border-b md:border-b-0 md:border-r border-black p-3">

                <strong>
                  Acceptance
                </strong>

                <div
                  className={`text-xl font-bold mt-1 ${
                    acceptanceStatus ===
                    "Accepted"
                      ? "text-green-700"
                      : acceptanceStatus ===
                        "Not Accepted"
                      ? "text-red-700"
                      : ""
                  }`}
                >
                  {acceptanceStatus ||
                    "-"}
                </div>

              </div>

              {/* ================================= */}
              {/* Tested By النهائي */}
              {/* ================================= */}

              <div className="border-b md:border-b-0 md:border-r border-black p-3">

                <strong>
                  Tested By (L.T)
                </strong>

                <input
                  type="text"
                  className="w-full border p-2 mt-2 bg-gray-100"
                  value={testedByName}
                  readOnly
                />

              </div>

              <div className="border-b md:border-b-0 md:border-r border-black p-3">

                <strong>
                  Checked By (M.E)
                </strong>

                <input
                  className="w-full border p-2 mt-2"
                  value={
                    form.checked_by
                  }
                  onChange={(e) =>
                    updateField(
                      "checked_by",
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="p-3">

                <strong>
                  Notes
                </strong>

                <textarea
                  className="w-full border p-2 mt-2"
                  value={form.notes}
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

        </div>

      </div>
    </ProtectedRoute>
  );
}

/* =========================
   Components
========================= */

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
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
        onChange={(e) =>
          onChange(e.target.value)
        }
      />

    </div>
  );
}

function DimensionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <td className="border border-black p-1">

      <input
        type="number"
        className="w-full min-w-[50px] p-1 border"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />

    </td>
  );
}