"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReportHeader from "@/components/reports/ReportHeader";

export default function ConcreteReportPage() {
  const params = useParams();
  const id = Number(params.id);

  const [test, setTest] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    const { data: testData, error } = await supabase
      .from("concrete_tests")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const { data: resultData } = await supabase
      .from("concrete_test_results")
      .select("*")
      .eq("test_id", id)
      .order("sample_no");

    setTest(testData);
    setResults(resultData || []);
    setLoading(false);
  }

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <ProtectedRoute>
      <div className="p-8 bg-white">

        <ReportHeader />

        <h1 className="text-2xl font-bold text-center mb-8">
          WORKSHEET FOR COMPRESSIVE STRENGTH OF CONCRETE
        </h1>

      </div>
    </ProtectedRoute>
  );
}