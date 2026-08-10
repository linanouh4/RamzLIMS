
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReportHeader from "@/components/reports/ReportHeader";

type Sample = {
  sample_no: number;
  slump: string;
  age_days: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  load_kn: string;
};

export default function ConcreteTestPage() {
  const params = useParams();
  const router = useRouter();

  const taskId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [samples, setSamples] = useState<Sample[]>([
    {
      sample_no: 1,
      slump: "",
      age_days: "",
      length: "",
      width: "",
      height: "",
      weight: "",
      load_kn: "",
    },
    {
      sample_no: 2,
      slump: "",
      age_days: "",
      length: "",
      width: "",
      height: "",
      weight: "",
      load_kn: "",
    },
    {
      sample_no: 3,
      slump: "",
      age_days: "",
      length: "",
      width: "",
      height: "",
      weight: "",
      load_kn: "",
    },
  ]);

  const [form, setForm] = useState({
    sample_code: "",
    sample_location: "",
    sampling_date: "",
    test_date: "",
    design_strength: "",
    cement_content: "",
    concrete_temperature: "",
    curing_temperature: "",
    specimen_type: "Cube",
    protection_capping: "",
    sampled_by: "",
    notes: "",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    if (!Number.isNaN(taskId)) {
      loadDraft();
    } else {
      setLoading(false);
    }
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

  async function loadDraft() {
    setLoading(true);

    try {
      const { data: draft, error } = await supabase
        .from("concrete_tests")
        .select("*")
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
        return;
      }

      setDraftId(draft.id);

      setForm({
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
        specimen_type: draft.specimen_type || "Cube",
        protection_capping:
          draft.protection_capping || "",
        sampled_by: draft.sampled_by || "",
        notes: draft.notes || "",
      });

      const { data: results, error: resultsError } =
        await supabase
          .from("concrete_test_results")
          .select("*")
          .eq("test_id", draft.id)
          .order("sample_no", { ascending: true });

      if (resultsError) {
        console.error(
          "LOAD SAMPLE RESULTS ERROR:",
          resultsError
        );
          return false;

      }

      if (results && results.length > 0) {
        const loadedSamples: Sample[] = [1, 2, 3].map(
          (sampleNo) => {
            const result = results.find(
              (item) => item.sample_no === sampleNo
            );

            return {
              sample_no: sampleNo,
              slump: result?.slump?.toString() || "",
              age_days:
                result?.age_days?.toString() || "",
              length:
                result?.length?.toString() || "",
              width:
                result?.width?.toString() || "",
              height:
                result?.height?.toString() || "",
              weight:
                result?.weight?.toString() || "",
              load_kn:
                result?.load_kn?.toString() || "",
            };
          }
        );

        setSamples(loadedSamples);
      }

      console.log("DRAFT FOUND:", draft);
    } finally {
      setLoading(false);
    }
  }

  async function saveTest(): Promise<boolean> {
    if (!taskId) {
      alert("رقم المهمة غير صحيح");
     return false;
    }

    setSaving(true);

    try {
      console.log("CURRENT USER:", user);
      console.log("TASK ID:", taskId);
      console.log("DRAFT ID:", draftId);

      const testValues = {
        task_id: taskId,

        sample_code: form.sample_code,
        sample_location: form.sample_location,

        sampling_date: form.sampling_date || null,
        test_date: form.test_date || null,

        design_strength:
          Number(form.design_strength) || null,

        cement_content:
          Number(form.cement_content) || null,

        concrete_temperature:
          Number(form.concrete_temperature) || null,

        curing_temperature:
          Number(form.curing_temperature) || null,

        specimen_type: form.specimen_type,

        protection_capping:
          form.protection_capping,

        sampled_by:
          form.sampled_by,

        tested_by: user?.id || null,

        notes: form.notes,

        status: "Draft",
      };

      let testData: any = null;
      let testError: any = null;

      if (draftId) {
        const result = await supabase
          .from("concrete_tests")
          .update(testValues)
          .eq("id", draftId)
          .select()
          .single();

        testData = result.data;
        testError = result.error;
      } else {
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
        console.error("SAVE TEST ERROR:", testError);
        alert(testError.message);
          return false;

      }

      if (!testData) {
        alert("لم يتم إنشاء نموذج الفحص");
        return false;
      }

      /*
       * حذف النتائج القديمة أولاً.
       * هذا يمنع تكرار نفس العينات عند الضغط على حفظ أكثر من مرة.
       */
      const { error: deleteError } = await supabase
        .from("concrete_test_results")
        .delete()
        .eq("test_id", testData.id);

      if (deleteError) {
        console.error(
          "DELETE OLD RESULTS ERROR:",
          deleteError
        );
        alert(deleteError.message);
        return false;
      }

      const results = samples.map((sample) => ({
        test_id: testData.id,

        sample_no: sample.sample_no,

        slump: Number(sample.slump) || null,

        age_days:
          Number(sample.age_days) || null,

        length:
          Number(sample.length) || null,

        width:
          Number(sample.width) || null,

        height:
          Number(sample.height) || null,

        weight:
          Number(sample.weight) || null,

        load_kn:
          Number(sample.load_kn) || null,
      }));

      const { error: resultError } = await supabase
        .from("concrete_test_results")
        .insert(results);

      if (resultError) {
        console.error(
          "SAVE SAMPLE RESULTS ERROR:",
          resultError
        );
        alert(resultError.message);
        return false;
      }

      alert("تم حفظ نموذج الفحص والعينات بنجاح");
      return true;
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
          <div className="bg-white rounded-xl shadow p-6">
            جاري تحميل نموذج الفحص...
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6">

        {/* زر الرجوع */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-blue-700 font-semibold print:hidden"
        >
          ← رجوع
        </button>

        {/* رأس التقرير */}
        <ReportHeader />

        {/* عنوان النموذج */}
        <h1 className="text-2xl font-bold mb-6">
          🧪 نموذج فحص قوة الخرسانة
        </h1>

        {/* بيانات الفحص */}
        <div className="grid md:grid-cols-2 gap-4">

          <input
            placeholder="كود العينة"
            className="border p-3 rounded"
            value={form.sample_code}
            onChange={(e) =>
              updateField(
                "sample_code",
                e.target.value
              )
            }
          />

          <input
            placeholder="موقع العينة"
            className="border p-3 rounded"
            value={form.sample_location}
            onChange={(e) =>
              updateField(
                "sample_location",
                e.target.value
              )
            }
          />

          <input
            type="date"
            className="border p-3 rounded"
            value={form.sampling_date}
            onChange={(e) =>
              updateField(
                "sampling_date",
                e.target.value
              )
            }
          />

          <input
            type="date"
            className="border p-3 rounded"
            value={form.test_date}
            onChange={(e) =>
              updateField(
                "test_date",
                e.target.value
              )
            }
          />

          <input
            placeholder="مقاومة التصميم Kg/cm2"
            className="border p-3 rounded"
            value={form.design_strength}
            onChange={(e) =>
              updateField(
                "design_strength",
                e.target.value
              )
            }
          />

          <input
            placeholder="محتوى الاسمنت Kg/m3"
            className="border p-3 rounded"
            value={form.cement_content}
            onChange={(e) =>
              updateField(
                "cement_content",
                e.target.value
              )
            }
          />

          <input
            placeholder="حرارة الخرسانة °C"
            className="border p-3 rounded"
            value={form.concrete_temperature}
            onChange={(e) =>
              updateField(
                "concrete_temperature",
                e.target.value
              )
            }
          />

          <input
            placeholder="حرارة المعالجة °C"
            className="border p-3 rounded"
            value={form.curing_temperature}
            onChange={(e) =>
              updateField(
                "curing_temperature",
                e.target.value
              )
            }
          />

          <select
            className="border p-3 rounded"
            value={form.specimen_type}
            onChange={(e) =>
              updateField(
                "specimen_type",
                e.target.value
              )
            }
          >
            <option value="Cube">
              Cube
            </option>

            <option value="Cylinder">
              Cylinder
            </option>

            <option value="Concrete Core">
              Concrete Core
            </option>
          </select>

          <input
            placeholder="الحماية والتغطية"
            className="border p-3 rounded"
            value={form.protection_capping}
            onChange={(e) =>
              updateField(
                "protection_capping",
                e.target.value
              )
            }
          />

          <input
            placeholder="أخذ العينة بواسطة"
            className="border p-3 rounded"
            value={form.sampled_by}
            onChange={(e) =>
              updateField(
                "sampled_by",
                e.target.value
              )
            }
          />

          <textarea
            placeholder="ملاحظات"
            className="border p-3 rounded md:col-span-2"
            value={form.notes}
            onChange={(e) =>
              updateField(
                "notes",
                e.target.value
              )
            }
          />

        </div>

        {/* نتائج العينات */}
        <div className="mt-8">

          <h2 className="text-xl font-bold mb-4">
            📋 نتائج العينات
          </h2>

          <div className="overflow-x-auto">

            <table className="min-w-full border">

              <thead>
                <tr className="bg-gray-100">

                  <th className="border p-2">
                    رقم العينة
                  </th>

                  <th className="border p-2">
                    Slump
                  </th>

                  <th className="border p-2">
                    العمر يوم
                  </th>

                  <th className="border p-2">
                    الطول
                  </th>

                  <th className="border p-2">
                    العرض
                  </th>

                  <th className="border p-2">
                    الارتفاع
                  </th>

                  <th className="border p-2">
                    الوزن
                  </th>

                  <th className="border p-2">
                    الحمل KN
                  </th>

                </tr>
              </thead>

              <tbody>

                {[1, 2, 3].map((row) => (

                  <tr key={row}>

                    <td className="border p-2 text-center">
                      {row}
                    </td>

                    <td className="border p-2">
                      <input
                        className="border w-20 p-1"
                        value={
                          samples[row - 1].slump
                        }
                        onChange={(e) =>
                          updateSample(
                            row - 1,
                            "slump",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="border p-2">
                      <input
                        className="border w-20 p-1"
                        value={
                          samples[row - 1].age_days
                        }
                        onChange={(e) =>
                          updateSample(
                            row - 1,
                            "age_days",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="border p-2">
                      <input
                        className="border w-20 p-1"
                        value={
                          samples[row - 1].length
                        }
                        onChange={(e) =>
                          updateSample(
                            row - 1,
                            "length",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="border p-2">
                      <input
                        className="border w-20 p-1"
                        value={
                          samples[row - 1].width
                        }
                        onChange={(e) =>
                          updateSample(
                            row - 1,
                            "width",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="border p-2">
                      <input
                        className="border w-20 p-1"
                        value={
                          samples[row - 1].height
                        }
                        onChange={(e) =>
                          updateSample(
                            row - 1,
                            "height",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="border p-2">
                      <input
                        className="border w-20 p-1"
                        value={
                          samples[row - 1].weight
                        }
                        onChange={(e) =>
                          updateSample(
                            row - 1,
                            "weight",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="border p-2">
                      <input
                        className="border w-20 p-1"
                        value={
                          samples[row - 1].load_kn
                        }
                        onChange={(e) =>
                          updateSample(
                            row - 1,
                            "load_kn",
                            e.target.value
                          )
                        }
                      />
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

        {/* أزرار التحكم */}
       <div className="flex flex-wrap gap-3 mt-6 print:hidden">

  <button
    onClick={saveTest}
    disabled={saving}
    className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg"
  >
    {saving
      ? "جاري الحفظ..."
      : "💾 حفظ المسودة"}
  </button>

 <button
  onClick={async () => {
    const success = await saveTest();

    if (success) {
      router.back();
    }
  }}
  disabled={saving}
  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg"
>
  💾 حفظ المسودة والخروج
</button>

  <button
    onClick={printReport}
    className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg"
  >
    🖨️ طباعة التقرير
  </button>

</div>
      </div>
    </ProtectedRoute>
  );
}
