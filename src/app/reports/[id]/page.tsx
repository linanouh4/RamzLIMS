"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;

  const [sample, setSample] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  async function loadReport() {
    setLoading(true);

    // Sample
    const { data: results } = await supabase
  .from("test_results")
  .select("*")
  .eq("sample_test_id", item.id);

    if (sampleError) {
      alert(sampleError.message);
      setLoading(false);
      return;
    }

    // Sample Tests
    const { data: sampleTests, error: testsError } = await supabase
      .from("sample_tests")
      .select("id,status,test_id")
      .eq("sample_id", id);

    if (testsError) {
      alert(testsError.message);
      setLoading(false);
      return;
    }

    const testsWithResults = await Promise.all(
      (sampleTests || []).map(async (item: any) => {
        const { data: test } = await supabase
          .from("tests")
          .select("test_name")
          .eq("id", item.test_id)
          .single();

        const { data: results } = await supabase
          .from("results")
          .select("*")
          .eq("sample_test_id", item.id);

        return {
          ...item,
          tests: test,
          results: results || [],
        };
      })
    );

    setSample({
      ...sampleData,
      sample_tests: testsWithResults,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-xl">
        Loading Report...
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="p-10 text-center text-xl">
        Report not found
      </div>
    );
  }
    return (
    <div className="bg-gray-100 min-h-screen p-8">

      <div className="flex justify-end max-w-5xl mx-auto mb-4">

        <button
          onClick={() => window.print()}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg print:hidden"
        >
          🖨️ Print Report
        </button>

      </div>

      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl p-10">

        <div className="text-center border-b-2 pb-6 mb-8">

          <h1 className="text-4xl font-bold">
            RAMZ EMIRATES LABORATORY
          </h1>

          <p className="text-gray-600 mt-2">
            Soil & Concrete Testing Laboratory
          </p>

          <h2 className="text-2xl font-bold mt-6">
            TEST REPORT
          </h2>

        </div>

        <div className="grid grid-cols-2 gap-6 mb-10">

          <div>
            <strong>Report Number</strong>
            <br />
            RPT-{sample.id}
          </div>

          <div>
            <strong>Sample Number</strong>
            <br />
            {sample.sample_number}
          </div>

          <div>
            <strong>Sample Type</strong>
            <br />
            {sample.sample_type}
          </div>

          <div>
            <strong>Received Date</strong>
            <br />
            {sample.received_date}
          </div>

          <div>
            <strong>Status</strong>
            <br />
            {sample.status}
          </div>

        </div>

        <table className="w-full border border-gray-300">

          <thead className="bg-gray-200">

            <tr>

              <th className="border p-3">Test</th>

              <th className="border p-3">Status</th>

              <th className="border p-3">Result</th>

              <th className="border p-3">Unit</th>

              <th className="border p-3">Notes</th>

            </tr>

          </thead>

          <tbody>

            {sample.sample_tests?.map((test: any) => {

              const result = test.results?.[0];

              return (

                <tr key={test.id}>

                  <td className="border p-3">
                    {test.tests?.test_name}
                  </td>

                  <td className="border p-3">
                    {test.status}
                  </td>

                  <td className="border p-3">
                    {result?.result_value || "-"}
                  </td>

                  <td className="border p-3">
                    {result?.unit || "-"}
                  </td>

                  <td className="border p-3">
                    {result?.notes || "-"}
                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>

        <div className="grid grid-cols-3 gap-10 mt-20 pt-10 border-t">

          <div className="text-center">

            <div className="border-b border-black h-12"></div>

            <p className="mt-2 font-semibold">
              Tested By
            </p>

          </div>

          <div className="text-center">

            <div className="border-b border-black h-12"></div>

            <p className="mt-2 font-semibold">
              Reviewed By
            </p>

          </div>

          <div className="text-center">

            <div className="border-b border-black h-12"></div>

            <p className="mt-2 font-semibold">
              Approved By
            </p>

          </div>

        </div>

      </div>

    </div>
  );
  }
