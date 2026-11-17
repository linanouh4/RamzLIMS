"use client";

import { useUiText } from "@/lib/uiText";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

export default function ReportsPage() {
  const ui = useUiText();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);

    const { data, error } = await supabase
      .from("samples")
      .select("id, sample_number, sample_type, status, received_date")
      .in("status", ["Completed", "Approved"])
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setReports(data || []);
    setLoading(false);
  }

  return (
    <ProtectedRoute>
      <div className="p-8 min-h-screen bg-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard");
              }
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {ui("← Back")}
          </button>
          <div>
            <h1 className="text-3xl font-bold text-blue-900">{ui("Reports")}</h1>
            <p className="text-gray-600 mt-2">{ui("Completed samples ready for reporting")}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">{ui("Loading reports...")}</div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center text-gray-500">{ui("No completed reports available yet.")}</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-start">{ui("Sample")}</th>
                  <th className="p-3 text-start">{ui("Type")}</th>
                  <th className="p-3 text-start">{ui("Status")}</th>
                  <th className="p-3 text-start">{ui("Received Date")}</th>
                  <th className="p-3 text-start">{ui("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-semibold">{report.sample_number || `Sample #${report.id}`}</td>
                    <td className="p-3">{report.sample_type || "-"}</td>
                    <td className="p-3">{report.status}</td>
                    <td className="p-3">{report.received_date || "-"}</td>
                    <td className="p-3">
                      <Link
                        href={`/reports/${report.id}`}
                        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg"
                      >
                        {ui("Open Report")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
