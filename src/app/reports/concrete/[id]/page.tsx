"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReportHeader from "@/components/reports/ReportHeader";

export default function ConcreteReportPage() {
  const params = useParams();
  const router = useRouter();

  const id = Number(params.id);

  const [test, setTest] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  async function loadReport() {
    setLoading(true);
const { data: testData, error: testError } = await supabase
  .from("concrete_tests")
  .select(`
    *,
    reviewed_by_user:reviewed_by (
      id,
      full_name,
      username
    ),
    tested_by_user:tested_by (
      id,
      full_name,
      username
    )
  `)
  .eq("id", id)
  .single();

    if (testError) {
      alert(testError.message);
      setLoading(false);
      return;
    }

    const { data: resultData, error: resultError } = await supabase
      .from("concrete_test_results")
      .select("*")
      .eq("test_id", id)
      .order("sample_no", { ascending: true });

    if (resultError) {
      alert(resultError.message);
      setLoading(false);
      return;
    }

    setTest(testData);
    setResults(resultData || []);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading Report...
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-10 text-center">
        Report not found
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 p-8 print:bg-white print:p-0">

        {/* أزرار التحكم */}
        <div className="max-w-6xl mx-auto mb-4 flex justify-between print:hidden">

          <button
            onClick={() => router.back()}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
          >
            ← رجوع
          </button>

          <button
            onClick={() => window.print()}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg"
          >
            🖨️ طباعة التقرير
          </button>

        </div>

        {/* التقرير */}
        <div className="report-page max-w-6xl mx-auto bg-white p-10 shadow-xl print:shadow-none print:p-8">

          <ReportHeader />

          <h1 className="text-2xl font-bold text-center mb-8">
            WORKSHEET FOR COMPRESSIVE STRENGTH OF CONCRETE
          </h1>

          {/* بيانات الفحص */}
          <table className="w-full border-collapse border border-black text-sm mb-8">

            <tbody>

              <tr>
                <td className="border border-black p-2 font-bold">
                  Sample Code
                </td>

                <td className="border border-black p-2">
                  {test.sample_code || "-"}
                </td>

                <td className="border border-black p-2 font-bold">
                  Sample Location
                </td>

                <td className="border border-black p-2">
                  {test.sample_location || "-"}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 font-bold">
                  Sampling Date
                </td>

                <td className="border border-black p-2">
                  {test.sampling_date || "-"}
                </td>

                <td className="border border-black p-2 font-bold">
                  Test Date
                </td>

                <td className="border border-black p-2">
                  {test.test_date || "-"}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 font-bold">
                  Design Strength
                </td>

                <td className="border border-black p-2">
                  {test.design_strength ?? "-"} Kg/cm²
                </td>

                <td className="border border-black p-2 font-bold">
                  Cement Content
                </td>

                <td className="border border-black p-2">
                  {test.cement_content ?? "-"} Kg/m³
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 font-bold">
                  Concrete Temperature
                </td>

                <td className="border border-black p-2">
                  {test.concrete_temperature ?? "-"} °C
                </td>

                <td className="border border-black p-2 font-bold">
                  Curing Temperature
                </td>

                <td className="border border-black p-2">
                  {test.curing_temperature ?? "-"} °C
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 font-bold">
                  Specimen Type
                </td>

                <td className="border border-black p-2">
                  {test.specimen_type || "-"}
                </td>

                <td className="border border-black p-2 font-bold">
                  Protection / Capping
                </td>

                <td className="border border-black p-2">
                  {test.protection_capping || "-"}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 font-bold">
                  Sampled By
                </td>

                <td className="border border-black p-2">
                  {test.sampled_by || "-"}
                </td>

                <td className="border border-black p-2 font-bold">
                  Status
                </td>

                <td className="border border-black p-2">
                  {test.status || "-"}
                </td>
              </tr>

            
<tr>
  <td className="border border-black p-2 font-bold">
    Order No.
  </td>

  <td className="border border-black p-2">
    {test.order_no || "-"}
  </td>

  <td className="border border-black p-2 font-bold">
    Test Specification
  </td>

  <td className="border border-black p-2">
    {test.test_specification || "-"}
  </td>
</tr>

<tr>
  <td className="border border-black p-2 font-bold">
    Average Strength
  </td>

  <td className="border border-black p-2">
    {test.average_strength ?? "-"} Kg/cm²
  </td>

  <td className="border border-black p-2 font-bold">
    Acceptance Status
  </td>

  <td className="border border-black p-2">
    {test.acceptance_status || "-"}
  </td>
</tr>

<tr>
  <td className="border border-black p-2 font-bold">
    Checked By
  </td>

  <td className="border border-black p-2">
    {test.checked_by || "-"}
  </td>

  <td className="border border-black p-2 font-bold">
    Tested By
  </td>

  <td className="border border-black p-2">
    {test.tested_by_user?.full_name ||
      test.tested_by_user?.username ||
      test.tested_by ||
      "-"}
  </td>
</tr>

            </tbody>
          </table>

          {/* نتائج العينات */}
          <h2 className="text-xl font-bold mb-4">
            TEST RESULTS
          </h2>

          <div className="overflow-x-auto">

            <table className="w-full border-collapse border border-black text-sm">

              <thead>
<tr className="bg-gray-100">

  <th className="border border-black p-2">
    Sample No.
  </th>

  <th className="border border-black p-2">
    Field Sample No.
  </th>

  <th className="border border-black p-2">
    Structure Part
  </th>

  <th className="border border-black p-2">
    Date Sampled
  </th>

  <th className="border border-black p-2">
    Slump
  </th>

  <th className="border border-black p-2">
    Age
    <br />
    Days
  </th>

  <th className="border border-black p-2">
    Length
  </th>

  <th className="border border-black p-2">
    Width
  </th>

  <th className="border border-black p-2">
    Height
  </th>

  <th className="border border-black p-2">
    Weight
  </th>

  <th className="border border-black p-2">
    Unit Weight
  </th>

  <th className="border border-black p-2">
    Load
    <br />
    kN
  </th>

  <th className="border border-black p-2">
    Load
    <br />
    Kg
  </th>

  <th className="border border-black p-2">
    Strength
  </th>

  <th className="border border-black p-2">
    Break Type
  </th>

  <th className="border border-black p-2">
    Remarks
  </th>

</tr>

              </thead>

              <tbody>

                {results.length === 0 ? (

                  <tr>

                    <td
                      colSpan={8}
                      className="border border-black p-4 text-center"
                    >
                      No test results
                    </td>

                  </tr>

                ) : (

                  results.map((result) => (

                    <tr key={result.id}>

  <td className="border border-black p-2 text-center">
    {result.sample_no ?? "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.field_sample_no || "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.structure_part || "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.date_sampled || "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.slump ?? "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.age_days ?? "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.length ?? "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.width ?? "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.height ?? "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.weight ?? "-"}
  </td>

  <td className="border border-black p-2 text-center">
    {result.unit_weight ?? "-"}
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

  <td className="border border-black p-2 text-center">
    {result.break_type || "-"}
  </td>

  <td className="border border-black p-2">
    {result.remarks || "-"}
  </td>

</tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

          {/* الملاحظات */}
          <div className="mt-8">

            <h2 className="font-bold mb-2">
              Notes
            </h2>

            <div className="border border-black min-h-[80px] p-3">
              {test.notes || "-"}
            </div>

          </div>

          {/* التوقيعات */}
          <div className="grid grid-cols-3 gap-8 mt-20 pt-8 border-t border-black">

            <div className="text-center">

              <div className="h-12 border-b border-black mb-2" />

              <p className="font-semibold">
                Tested By
              </p>

            </div>

            <div className="text-center">

              <div className="h-12 border-b border-black mb-2" />

             <p className="font-semibold">
  Reviewed By
</p>

<p className="text-sm mt-2">
  {test.reviewed_by_user?.full_name ||
    test.reviewed_by_user?.username ||
    "Not Reviewed"}
</p>

{test.reviewed_at && (
  <p className="text-xs text-gray-600 mt-1">
    {new Date(test.reviewed_at).toLocaleString("en-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })}
  </p>
)}

            </div>

            <div className="text-center">

              <div className="h-12 border-b border-black mb-2" />

              <p className="font-semibold">
                Approved By
              </p>

            </div>

          </div>

      </div>
            </div>

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        @media print {
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          .report-page {
            width: 100%;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }
        }
      `}</style>

    </ProtectedRoute>
  );
}
 