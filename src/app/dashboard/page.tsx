"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  const [samplesCount, setSamplesCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [testsCount, setTestsCount] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { count: samples } = await supabase
      .from("samples")
      .select("*", { count: "exact", head: true });

    const { count: clients } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    const { count: projects } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });

    const { count: tests } = await supabase
      .from("tests")
      .select("*", { count: "exact", head: true });

    setSamplesCount(samples || 0);
    setClientsCount(clients || 0);
    setProjectsCount(projects || 0);
    setTestsCount(tests || 0);
  }

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };
    return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-100 flex">

        <Sidebar user={user} />

        <section className="flex-1 p-8">

          <div className="flex justify-between items-center mb-8">

            <div>

              <h2 className="text-3xl font-bold">
                Dashboard
              </h2>

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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-gray-500 text-sm">
                👥 Clients
              </h3>

              <p className="text-4xl font-bold mt-3">
                {clientsCount}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-gray-500 text-sm">
                📁 Projects
              </h3>

              <p className="text-4xl font-bold mt-3">
                {projectsCount}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-gray-500 text-sm">
                🧪 Samples
              </h3>

              <p className="text-4xl font-bold mt-3">
                {samplesCount}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-gray-500 text-sm">
                🔬 Tests
              </h3>

              <p className="text-4xl font-bold mt-3">
                {testsCount}
              </p>
            </div>

          </div>

          <div className="bg-white rounded-xl shadow mt-8 p-6">

            <h3 className="text-xl font-bold mb-4">
              RamzLIMS Overview
            </h3>

            <div className="grid grid-cols-2 gap-6">

              <div className="border rounded-lg p-4">
                <p className="text-gray-500">
                  Registered Clients
                </p>

                <p className="text-2xl font-bold mt-2">
                  {clientsCount}
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <p className="text-gray-500">
                  Active Projects
                </p>

                <p className="text-2xl font-bold mt-2">
                  {projectsCount}
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <p className="text-gray-500">
                  Samples Received
                </p>

                <p className="text-2xl font-bold mt-2">
                  {samplesCount}
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <p className="text-gray-500">
                  Laboratory Tests
                </p>

                <p className="text-2xl font-bold mt-2">
                  {testsCount}
                </p>
              </div>

            </div>

          </div>

        </section>

      </main>
    </ProtectedRoute>
  );
}
