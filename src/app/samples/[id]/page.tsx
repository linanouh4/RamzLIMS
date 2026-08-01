"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AddTestToSampleModal from "@/components/AddTestToSampleModal";
import AddResultModal from "@/components/AddResultModal";

export default function SampleDetailsPage() {

  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sample, setSample] = useState<any>(null);
  const [sampleTests, setSampleTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openAddTest, setOpenAddTest] = useState(false);

  const [openResult, setOpenResult] = useState(false);
  const [selectedSampleTest, setSelectedSampleTest] =
    useState<number | null>(null);

  const [selectedResult, setSelectedResult] =
    useState<any>(null);

  useEffect(() => {
    if (id) {
      loadSample();
    }
  }, [id]);

  async function loadSample() {
    setLoading(true);

    const { data, error } = await supabase
      .from("samples")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setSample(data);

    const { data: tests, error: testsError } = await supabase
      .from("sample_tests")
      .select(`
        id,
        status,
        tests (
          test_name
        ),
        test_results (
          id,
          result_value,
          unit,
          notes
        )
      `)
      .eq("sample_id", id);

    if (testsError) {
      alert(testsError.message);
    }

    setSampleTests(tests || []);
    setLoading(false);
  }

  async function updateStatus(
    testId: number,
    status: string
  ) {
    const { error } = await supabase
      .from("sample_tests")
      .update({
        status,
      })
      .eq("id", testId);

    if (error) {
      alert(error.message);
      return;
    }

    loadSample();
  }

  async function deleteTest(testId: number) {
    const confirmDelete = confirm("Delete this test?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("sample_tests")
      .delete()
      .eq("id", testId);

    if (error) {
      alert(error.message);
      return;
    }

    loadSample();
  }

  async function deleteResult(resultId: number) {
    const confirmDelete = confirm("Delete this result?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("test_results")
      .delete()
      .eq("id", resultId);

    if (error) {
      alert(error.message);
      return;
    }

    loadSample();
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading...
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="p-8 text-center">
        Sample not found
      </div>
    );
  }

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold mb-8">
        Sample Details
      </h1>

      <div className="bg-white rounded-xl shadow p-6 mb-8">

        <div className="grid grid-cols-2 gap-4">

          <div>
            <strong>Sample Number:</strong><br />
            {sample.sample_number}
          </div>

          <div>
            <strong>Sample Type:</strong><br />
            {sample.sample_type}
          </div>

          <div>
            <strong>Received Date:</strong><br />
            {sample.received_date}
          </div>

          <div>
            <strong>Received By:</strong><br />
            {sample.received_by}
          </div>

          <div>
            <strong>Status:</strong><br />
            {sample.status}
          </div>

          <div>
            <strong>Condition:</strong><br />
            {sample.received_condition}
          </div>

          <div className="col-span-2">
            <strong>Notes:</strong><br />
            {sample.notes || "-"}
          </div>

        </div>

      </div>

      <div className="bg-white rounded-xl shadow p-6">

        <div className="flex justify-between items-center mb-5">

          <h2 className="text-2xl font-bold">
            Tests
          </h2>

          <div className="flex gap-3">

            <button
              onClick={() => router.push(`/reports/${id}`)}
              className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg"
            >
              View Report
            </button>

            <button
              onClick={() => setOpenAddTest(true)}
              className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
            >
              + Add Test
            </button>

          </div>

        </div>

        {/* باقي الكود (الاختبارات، النتائج، والمودالات) يبقى كما هو بدون أي تغيير */}
      </div>

      {/* نفس AddTestToSampleModal و AddResultModal الموجودين عندك بدون أي تعديل */}
    </div>
  );
}
