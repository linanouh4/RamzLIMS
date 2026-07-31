"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AddTestToSampleModal from "@/components/AddTestToSampleModal";

export default function SampleDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [sample, setSample] = useState<any>(null);
  const [sampleTests, setSampleTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddTest, setOpenAddTest] = useState(false);

  useEffect(() => {
    loadSample();
  }, []);

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

    const { data: tests } = await supabase
      .from("sample_tests")
      .select(`
        *,
        tests (
          test_name
        )
      `)
      .eq("sample_id", id);

    setSampleTests(tests || []);

    setLoading(false);
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

          <button
            onClick={() => setOpenAddTest(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
          >
            + Add Test
          </button>

        </div>
