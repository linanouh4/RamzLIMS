"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReportHeader from "@/components/reports/ReportHeader";

type Result = {
  sample_no: number;
  field_sample_no: string;
  station: string;
  layer_thickness: string;

  can_no: string;
  can_empty: string;
  can_wet: string;
  can_dry: string;

  sand_before: string;
  sand_after: string;
  wet_soil: string;
  sand_cone_plate: string;
  sand_density: string;
};

const emptyResult = (sample_no: number): Result => ({
  sample_no,
  field_sample_no: "",
  station: "",
  layer_thickness: "",

  can_no: "",
  can_empty: "",
  can_wet: "",
  can_dry: "",

  sand_before: "",
  sand_after: "",
  wet_soil: "",
  sand_cone_plate: "",
  sand_density: "1.546",
});

export default function FieldDensityPage() {
  const params = useParams();
  const router = useRouter();

  const taskId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    order_no: "",
    sample_code: "",
    sampling_date: "",
    test_date: "",
    sampled_by: "",
    classification: "",
    checked_by: "",
    sample_location: "",
    source_material: "",
    method: "ASTM D1556",

    mdd: "",
    optimum_moisture: "",
    reference_report: "",
    reference_date: "",
    technical_manager: "",
    report_review: "",
  });

  const [results, setResults] = useState<Result[]>(
    Array.from({ length: 8 }, (_, i) => emptyResult(i + 1))
  );

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

  function updateForm(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateResult(
    index: number,
    field: keyof Result,
    value: string
  ) {
    setResults((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      return updated;
    });
  }

  function num(value: string) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function moisture(result: Result) {
    const A = num(result.can_empty);
    const B = num(result.can_wet);
    const C = num(result.can_dry);

    if (!A || !B || !C || C <= A) return null;

    const D = B - C;
    const E = C - A;

    return (D * 100) / E;
  }

  function sandInHole(result: Result) {
    const G = num(result.sand_before);
    const H = num(result.sand_after);

    if (!G || !H) return null;

    return G - H;
  }

  function sandInHoleCorrected(result: Result) {
    const J = sandInHole(result);
    const K = num(result.sand_cone_plate);

    if (J === null || !K) return null;

    return J - K;
  }

  function holeVolume(result: Result) {
    const L = sandInHoleCorrected(result);
    const M = num(result.sand_density);

    if (L === null || !M) return null;

    return L / M;
  }

  function wetDensity(result: Result) {
    const I = num(result.wet_soil);
    const N = holeVolume(result);

    if (!I || !N) return null;

    return I / N;
  }

  function dryDensity(result: Result) {
    const O = wetDensity(result);
    const F = moisture(result);

    if (O === null || F === null) return null;

    return O / (F / 100 + 1);
  }

  function compaction(result: Result) {
    const P = dryDensity(result);
    const MDD = num(form.mdd);

    if (P === null || !MDD) return null;

    return (P * 100) / MDD;
  }

  const averageDryDensity = useMemo(() => {
    const values = results
      .map(dryDensity)
      .filter((v): v is number => v !== null);

    if (!values.length) return null;

    return (
      values.reduce((sum, value) => sum + value, 0) /
      values.length
    );
  }, [results, form.mdd]);

  async function loadDraft() {
    setLoading(true);

    try {
      const { data: draft, error } = await supabase
        .from("field_density_tests")
        .select("*")
        .eq("task_id", taskId)
        .eq("status", "Draft")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("LOAD FIELD DENSITY ERROR:", error);
        alert(error.message);
        return;
      }

      if (!draft) {
        setLoading(false);
        return;
      }

      setDraftId(draft.id);

      setForm({
        order_no: draft.order_no || "",
        sample_code: draft.sample_code || "",
        sampling_date: draft.sampling_date || "",
        test_date: draft.test_date || "",
        sampled_by: draft.sampled_by || "",
        classification: draft.classification || "",
        checked_by: draft.checked_by || "",
        sample_location: draft.sample_location || "",
        source_material: draft.source_material || "",
        method: draft.method || "ASTM D1556",

        mdd: draft.mdd?.toString() || "",
        optimum_moisture:
          draft.optimum_moisture?.toString() || "",
        reference_report: draft.reference_report || "",
        reference_date: draft.reference_date || "",
        technical_manager: draft.technical_manager || "",
        report_review: draft.report_review || "",
      });

      const { data: loadedResults, error: resultsError } =
        await supabase
          .from("field_density_results")
          .select("*")
          .eq("test_id", draft.id)
          .order("sample_no", { ascending: true });

      if (resultsError) {
        console.error(
          "LOAD FIELD DENSITY RESULTS ERROR:",
          resultsError
        );
        return;
      }

      if (loadedResults?.length) {
        setResults(
          Array.from({ length: 8 }, (_, index) => {
            const sampleNo = index + 1;

            const item = loadedResults.find(
              (r) => Number(r.sample_no) === sampleNo
            );

            if (!item) return emptyResult(sampleNo);

            return {
              sample_no: sampleNo,
              field_sample_no: item.field_sample_no || "",
              station: item.station || "",
              layer_thickness:
                item.layer_thickness?.toString() || "",

              can_no: item.can_no || "",
              can_empty: item.can_empty?.toString() || "",
              can_wet: item.can_wet?.toString() || "",
              can_dry: item.can_dry?.toString() || "",

              sand_before:
                item.sand_before?.toString() || "",
              sand_after:
                item.sand_after?.toString() || "",
              wet_soil:
                item.wet_soil?.toString() || "",
              sand_cone_plate:
                item.sand_cone_plate?.toString() || "",
              sand_density:
                item.sand_density?.toString() || "1.546",
            };
          })
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveTest() {
    if (!taskId) {
      alert("رقم المهمة غير صحيح");
      return;
    }

    setSaving(true);

    try {
      const testValues = {
        task_id: taskId,

        order_no: form.order_no || null,
        sample_code: form.sample_code || null,
        sampling_date: form.sampling_date || null,
        test_date: form.test_date || null,
        sampled_by: form.sampled_by || null,
        classification: form.classification || null,
        checked_by: form.checked_by || null,
        sample_location: form.sample_location || null,
        source_material: form.source_material || null,
        method: form.method,

        mdd: num(form.mdd) || null,
        optimum_moisture:
          num(form.optimum_moisture) || null,
        reference_report:
          form.reference_report || null,
        reference_date:
          form.reference_date || null,
        technical_manager:
          form.technical_manager || null,
        report_review:
          form.report_review || null,

        status: "Draft",
      };

      let testData: any;
      let testError: any;

      if (draftId) {
        const result = await supabase
          .from("field_density_tests")
          .update(testValues)
          .eq("id", draftId)
          .select()
          .single();

        testData = result.data;
        testError = result.error;
      } else {
        const result = await supabase
          .from("field_density_tests")
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
          "SAVE FIELD DENSITY ERROR:",
          JSON.stringify(testError, null, 2)
        );

        alert(testError.message);
        return;
      }

      await supabase
        .from("field_density_results")
        .delete()
        .eq("test_id", testData.id);

      const rows = results.map((result) => ({
        test_id: testData.id,
        sample_no: result.sample_no,

        field_sample_no:
          result.field_sample_no || null,

        station:
          result.station || null,

        layer_thickness:
          num(result.layer_thickness) || null,

        can_no:
          result.can_no || null,

        can_empty:
          num(result.can_empty) || null,

        can_wet:
          num(result.can_wet) || null,

        can_dry:
          num(result.can_dry) || null,

        moisture:
          moisture(result) !== null
            ? Number(moisture(result)!.toFixed(2))
            : null,

        sand_before:
          num(result.sand_before) || null,

        sand_after:
          num(result.sand_after) || null,

        wet_soil:
          num(result.wet_soil) || null,

        sand_cone_plate:
          num(result.sand_cone_plate) || null,

        sand_in_hole:
          sandInHoleCorrected(result) !== null
            ? Number(
                sandInHoleCorrected(result)!.toFixed(2)
              )
            : null,

        sand_density:
          num(result.sand_density) || null,

        hole_volume:
          holeVolume(result) !== null
            ? Number(
                holeVolume(result)!.toFixed(2)
              )
            : null,

        wet_density:
          wetDensity(result) !== null
            ? Number(
                wetDensity(result)!.toFixed(3)
              )
            : null,

        dry_density:
          dryDensity(result) !== null
            ? Number(
                dryDensity(result)!.toFixed(3)
              )
            : null,

        compaction:
          compaction(result) !== null
            ? Number(
                compaction(result)!.toFixed(1)
              )
            : null,
      }));

      const { error: insertError } = await supabase
        .from("field_density_results")
        .insert(rows);

      if (insertError) {
        console.error(
          "SAVE FIELD DENSITY RESULTS ERROR:",
          insertError
        );

        alert(insertError.message);
        return;
      }

      alert("تم حفظ المسودة بنجاح");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          جاري تحميل نموذج الفحص...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
<button
  onClick={() => router.back()}
  className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg mb-4"
>
  ← رجوع
</button>
        <div className="flex flex-wrap gap-3 mb-4 print:hidden">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-5 py-2 rounded-lg"
          >
            ← رجوع
          </button>

          <button
            onClick={saveTest}
            disabled={saving}
            className="bg-blue-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg"
          >
            {saving ? "جاري الحفظ..." : "💾 حفظ المسودة"}
          </button>

          <button
            onClick={async () => {
              await saveTest();
              router.back();
            }}
            disabled={saving}
            className="bg-orange-600 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg"
          >
            💾 حفظ المسودة والخروج
          </button>

          <button
            onClick={() => window.print()}
            className="bg-green-700 text-white px-5 py-2 rounded-lg"
          >
            🖨️ طباعة التقرير
          </button>
        </div>

        <div className="bg-white p-4 md:p-6 shadow-sm">

          <ReportHeader />

          <div className="border border-black mt-4">

            <div className="text-center font-bold text-lg p-3 border-b border-black">
              Technical Data Sheet
            </div>

            <div className="text-center font-bold p-2">
              Field Density by Sand Cone Test - ASTM D1556
            </div>

          </div>

          <div className="grid grid-cols-2 border-l border-r border-black">

            <Field
              label="Order No#"
              value={form.order_no}
              onChange={(v) => updateForm("order_no", v)}
            />

            <Field
              label="Sampling Date"
              type="date"
              value={form.sampling_date}
              onChange={(v) =>
                updateForm("sampling_date", v)
              }
            />

            <Field
              label="Sample Code#"
              value={form.sample_code}
              onChange={(v) =>
                updateForm("sample_code", v)
              }
            />

            <Field
              label="Date Tested"
              type="date"
              value={form.test_date}
              onChange={(v) =>
                updateForm("test_date", v)
              }
            />

            <Field
              label="Sampled By"
              value={form.sampled_by}
              onChange={(v) =>
                updateForm("sampled_by", v)
              }
            />

            <Field
              label="Classification of Materials"
              value={form.classification}
              onChange={(v) =>
                updateForm("classification", v)
              }
            />

            <Field
              label="Checked By"
              value={form.checked_by}
              onChange={(v) =>
                updateForm("checked_by", v)
              }
            />

            <Field
              label="Sample Location"
              value={form.sample_location}
              onChange={(v) =>
                updateForm("sample_location", v)
              }
            />

            <Field
              label="Method"
              value={form.method}
              onChange={(v) =>
                updateForm("method", v)
              }
            />

            <Field
              label="Source of Materials"
              value={form.source_material}
              onChange={(v) =>
                updateForm("source_material", v)
              }
            />

          </div>

          <DensityTable
            results={results}
            updateResult={updateResult}
            moisture={moisture}
            sandInHoleCorrected={sandInHoleCorrected}
            holeVolume={holeVolume}
            wetDensity={wetDensity}
            dryDensity={dryDensity}
            compaction={compaction}
          />

          <div className="mt-5 border border-black">

            <div className="font-bold p-2 border-b border-black">
              E - Modified Proctor Test: ASTM D-1557
            </div>

            <div className="grid grid-cols-2">

              <Field
                label="Reference Report No."
                value={form.reference_report}
                onChange={(v) =>
                  updateForm("reference_report", v)
                }
              />

              <Field
                label="Date"
                type="date"
                value={form.reference_date}
                onChange={(v) =>
                  updateForm("reference_date", v)
                }
              />

              <Field
                label="Maximum Dry Density M.D.D (g/cm³)"
                type="number"
                value={form.mdd}
                onChange={(v) =>
                  updateForm("mdd", v)
                }
              />

              <Field
                label="Optimum Moisture Content (%)"
                type="number"
                value={form.optimum_moisture}
                onChange={(v) =>
                  updateForm("optimum_moisture", v)
                }
              />

              <Field
                label="Technical Manager"
                value={form.technical_manager}
                onChange={(v) =>
                  updateForm("technical_manager", v)
                }
              />

              <Field
                label="Report Review"
                value={form.report_review}
                onChange={(v) =>
                  updateForm("report_review", v)
                }
              />

            </div>
          </div>

          {averageDryDensity !== null && (
            <div className="mt-4 border border-black p-3 font-bold">
              Average Dry Density:
              {" "}
              {averageDryDensity.toFixed(3)}
              {" g/cm³"}
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}

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
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DensityTable({
  results,
  updateResult,
  moisture,
  sandInHoleCorrected,
  holeVolume,
  wetDensity,
  dryDensity,
  compaction,
}: any) {
  return (
    <div className="overflow-x-auto mt-5">

      <table className="w-full border-collapse border border-black text-[10px]">

        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Symb.</th>

            {results.map((r: Result) => (
              <th key={r.sample_no} className="border p-2">
                {r.sample_no}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>

          <tr>
            <td className="border p-2 font-bold">
              Field Sample No.
            </td>

            {results.map((r: Result, i: number) => (
              <td key={r.sample_no} className="border p-1">
                <input
                  className="w-full border p-1"
                  value={r.field_sample_no}
                  onChange={(e) =>
                    updateResult(
                      i,
                      "field_sample_no",
                      e.target.value
                    )
                  }
                />
              </td>
            ))}
          </tr>

          <tr>
            <td className="border p-2">
              Station / Location
            </td>

            {results.map((r: Result, i: number) => (
              <td key={r.sample_no} className="border p-1">
                <input
                  className="w-full border p-1"
                  value={r.station}
                  onChange={(e) =>
                    updateResult(
                      i,
                      "station",
                      e.target.value
                    )
                  }
                />
              </td>
            ))}
          </tr>

          <tr>
            <td className="border p-2">
              Layer Thickness (cm)
            </td>

            {results.map((r: Result, i: number) => (
              <td key={r.sample_no} className="border p-1">
                <input
                  type="number"
                  className="w-full border p-1"
                  value={r.layer_thickness}
                  onChange={(e) =>
                    updateResult(
                      i,
                      "layer_thickness",
                      e.target.value
                    )
                  }
                />
              </td>
            ))}
          </tr>

          <tr className="bg-gray-200">
            <td
              colSpan={9}
              className="border p-2 font-bold"
            >
              B - Moisture Content - ASTM D2216 Method B
            </td>
          </tr>

          {[
            ["Can No.", "can_no"],
            ["Empty Can A", "can_empty"],
            ["Can + Wet Soil B", "can_wet"],
            ["Can + Dry Soil C", "can_dry"],
          ].map(([label, field]) => (
            <tr key={field}>
              <td className="border p-2">{label}</td>

              {results.map((r: Result, i: number) => (
                <td key={r.sample_no} className="border p-1">
                  <input
                    className="w-full border p-1"
                    value={(r as any)[field]}
                    onChange={(e) =>
                      updateResult(
                        i,
                        field as keyof Result,
                        e.target.value
                      )
                    }
                  />
                </td>
              ))}
            </tr>
          ))}

          <tr>
            <td className="border p-2">
              Moisture Content F %
            </td>

            {results.map((r: Result) => (
              <td
                key={r.sample_no}
                className="border p-2 text-center bg-gray-50"
              >
                {moisture(r)?.toFixed(2) || ""}
              </td>
            ))}
          </tr>

          <tr className="bg-gray-200">
            <td
              colSpan={9}
              className="border p-2 font-bold"
            >
              C - Field Density
            </td>
          </tr>

          {[
            ["G - Sand + Cone Before", "sand_before"],
            ["H - Sand + Cone After", "sand_after"],
            ["I - Wet Soil Extracted", "wet_soil"],
            ["K - Sand in Cone + Plate", "sand_cone_plate"],
            ["M - Standard Sand Density", "sand_density"],
          ].map(([label, field]) => (
            <tr key={field}>
              <td className="border p-2">{label}</td>

              {results.map((r: Result, i: number) => (
                <td key={r.sample_no} className="border p-1">
                  <input
                    type="number"
                    className="w-full border p-1"
                    value={(r as any)[field]}
                    onChange={(e) =>
                      updateResult(
                        i,
                        field as keyof Result,
                        e.target.value
                      )
                    }
                  />
                </td>
              ))}
            </tr>
          ))}

          {[
            ["J = G-H", (r: Result) => {
              const v =
                Number(r.sand_before) -
                Number(r.sand_after);

              return v || null;
            }],

            ["L = J-K", sandInHoleCorrected],

            ["N = L/M", holeVolume],

            ["O - Wet Density", wetDensity],

            ["P - Dry Density", dryDensity],

            ["Q - Compaction %", compaction],
          ].map(([label, fn]: any) => (
            <tr key={label}>
              <td className="border p-2 font-bold">
                {label}
              </td>

              {results.map((r: Result) => {
                const value = fn(r);

                return (
                  <td
                    key={r.sample_no}
                    className="border p-2 text-center bg-gray-50"
                  >
                    {value !== null &&
                    value !== undefined
                      ? Number(value).toFixed(
                          label.includes("%")
                            ? 1
                            : 3
                        )
                      : ""}
                  </td>
                );
              })}
            </tr>
          ))}

        </tbody>
      </table>
    </div>
  );
}