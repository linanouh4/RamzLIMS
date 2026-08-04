"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSavedUser, clearSavedUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [samplesCount, setSamplesCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [testsCount, setTestsCount] = useState(0);
  const [pendingSamplesCount, setPendingSamplesCount] = useState(0);
  const [recentSamples, setRecentSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = getSavedUser();
    if (savedUser) {
      setUser(savedUser);
    }
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [
        { count: samples },
        { count: clients },
        { count: projects },
        { count: tests },
        { count: pendingSamples },
        { data: recentSamplesData },
      ] = await Promise.all([
        supabase.from("samples").select("*", { count: "exact", head: true }),
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("tests").select("*", { count: "exact", head: true }),
        supabase.from("samples").select("*", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("samples").select("id, sample_number, sample_type, status, received_date").order("id", { ascending: false }).limit(5),
      ]);

      setSamplesCount(samples || 0);
      setClientsCount(clients || 0);
      setProjectsCount(projects || 0);
      setTestsCount(tests || 0);
      setPendingSamplesCount(pendingSamples || 0);
      setRecentSamples(recentSamplesData || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const logout = () => {
    clearSavedUser();
    router.push("/");
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-100 flex">
        <Sidebar user={user} />

        <section className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold">Dashboard</h2>
              {user && (
                <p className="text-gray-500 mt-2">
                  Welcome {user.full_name} | Role: {user.role}
                </p>
              )}
            </div>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>

          {loading ? (
            <div className="bg-white p-8 rounded-xl shadow">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-5 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">👥 Clients</h3>
                  <p className="text-4xl font-bold mt-3">{clientsCount}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">📁 Projects</h3>
                  <p className="text-4xl font-bold mt-3">{projectsCount}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">🧪 Samples</h3>
                  <p className="text-4xl font-bold mt-3">{samplesCount}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">🔬 Tests</h3>
                  <p className="text-4xl font-bold mt-3">{testsCount}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">⏳ Pending</h3>
                  <p className="text-4xl font-bold mt-3">{pendingSamplesCount}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mt-8">
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Recent Samples</h3>
                    <button
                      onClick={() => router.push("/samples")}
                      className="text-sm text-blue-700 font-semibold"
                    >
                      View all
                    </button>
                  </div>

                  <div className="space-y-3">
                    {recentSamples.length === 0 ? (
                      <p className="text-gray-500">No samples yet.</p>
                    ) : (
                      recentSamples.map((sample) => (
                        <div key={sample.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="font-semibold">{sample.sample_number || `Sample #${sample.id}`}</p>
                            <p className="text-sm text-gray-500">{sample.sample_type || "Unknown type"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{sample.status || "Pending"}</p>
                            <p className="text-xs text-gray-400">{sample.received_date || "-"}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button onClick={() => router.push("/samples")} className="w-full text-left rounded-lg border p-3 hover:bg-blue-50">
                      🧪 Manage Samples
                    </button>
                    <button onClick={() => router.push("/clients")} className="w-full text-left rounded-lg border p-3 hover:bg-blue-50">
                      👥 Manage Clients
                    </button>
                    <button onClick={() => router.push("/projects")} className="w-full text-left rounded-lg border p-3 hover:bg-blue-50">
                      📁 Manage Projects
                    </button>
                    <button onClick={() => router.push("/tests")} className="w-full text-left rounded-lg border p-3 hover:bg-blue-50">
                      🔬 Manage Tests
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
