"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSavedUser, clearSavedUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

const BRANCHES = [
  { id: 1, name: "فرع القريات" },
  { id: 2, name: "فرع جدة" },
  { id: 3, name: "فرع الخبر" },
  { id: 4, name: "فرع سكاكا" },
  { id: 6, name: "فرع الرياض" },
];

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

  // للـ Admin فقط
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    null
  );

  useEffect(() => {
    const savedUser = getSavedUser();

    if (!savedUser) {
      router.push("/");
      return;
    }

    // الفني يذهب إلى صفحة الفني
    if (savedUser.role === "technician") {
      router.push("/technician");
      return;
    }

    setUser(savedUser);

    const role = String(savedUser.role || "")
      .trim()
      .toLowerCase();

    // Admin يبدأ على "كل الفروع"
    if (role === "admin") {
      setSelectedBranchId(null);
      loadDashboard(savedUser, null);
    } else {
      // مدير الفرع يبدأ على فرعه فقط
      const branchId =
        savedUser.branch_id !== null &&
        savedUser.branch_id !== undefined
          ? Number(savedUser.branch_id)
          : null;

      setSelectedBranchId(branchId);
      loadDashboard(savedUser, branchId);
    }
  }, [router]);

  // تغيير الفرع للـ Admin
  useEffect(() => {
    if (!user) return;

    const role = String(user.role || "")
      .trim()
      .toLowerCase();

    if (role !== "admin") return;

    loadDashboard(user, selectedBranchId);
  }, [selectedBranchId]);

  async function loadDashboard(
    currentUser: any,
    branchFilter: number | null
  ) {
    try {
      setLoading(true);

      const role = String(currentUser?.role || "")
        .trim()
        .toLowerCase();

      const userBranchId =
        currentUser?.branch_id !== null &&
        currentUser?.branch_id !== undefined
          ? Number(currentUser.branch_id)
          : null;

      const isAdmin = role === "admin";
      const isBranchManager = role === "branch_manager";

      /*
       * =====================================================
       * تحديد الفرع المطلوب
       * =====================================================
       *
       * Admin:
       * branchFilter = null => كل الفروع
       * branchFilter = رقم => فرع محدد
       *
       * Branch Manager:
       * دائماً فرعه فقط
       */

      let effectiveBranchId: number | null = null;

      if (isAdmin) {
        effectiveBranchId = branchFilter;
      } else if (isBranchManager) {
        effectiveBranchId = userBranchId;
      }

      console.log("DASHBOARD FILTER:", {
        role,
        userBranchId,
        selectedBranchId: branchFilter,
        effectiveBranchId,
      });

      /*
       * =====================================================
       * CLIENTS
       * =====================================================
       */

      let clientsQuery = supabase
        .from("clients")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (effectiveBranchId !== null) {
        clientsQuery = clientsQuery.eq(
          "branch_id",
          effectiveBranchId
        );
      }

      /*
       * =====================================================
       * PROJECTS
       * =====================================================
       */

      let projectsQuery = supabase
        .from("projects")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (effectiveBranchId !== null) {
        projectsQuery = projectsQuery.eq(
          "branch_id",
          effectiveBranchId
        );
      }

      /*
       * =====================================================
       * TESTS
       * =====================================================
       */

      let testsQuery = supabase
        .from("tests")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (effectiveBranchId !== null) {
        testsQuery = testsQuery.eq(
          "branch_id",
          effectiveBranchId
        );
      }

      /*
       * =====================================================
       * PROJECT IDS FOR SAMPLES
       * =====================================================
       *
       * samples لا يوجد فيها branch_id.
       * لذلك نأخذ المشاريع الخاصة بالفرع أولاً.
       */

      let branchProjectIds: number[] = [];

      if (effectiveBranchId !== null) {
        const {
          data: branchProjects,
          error: branchProjectsError,
        } = await supabase
          .from("projects")
          .select("id")
          .eq("branch_id", effectiveBranchId);

        if (branchProjectsError) {
          console.error(
            "LOAD BRANCH PROJECTS ERROR:",
            branchProjectsError
          );
        }

        branchProjectIds = (branchProjects || []).map(
          (project: any) => Number(project.id)
        );
      }

      /*
       * =====================================================
       * SAMPLES
       * =====================================================
       */

      let samplesQuery = supabase
        .from("samples")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (effectiveBranchId !== null) {
        if (branchProjectIds.length === 0) {
          samplesQuery = samplesQuery.eq("id", -1);
        } else {
          samplesQuery = samplesQuery.in(
            "project_id",
            branchProjectIds
          );
        }
      }

      /*
       * =====================================================
       * PENDING SAMPLES
       * =====================================================
       */

      let pendingSamplesQuery = supabase
        .from("samples")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "Pending");

      if (effectiveBranchId !== null) {
        if (branchProjectIds.length === 0) {
          pendingSamplesQuery =
            pendingSamplesQuery.eq("id", -1);
        } else {
          pendingSamplesQuery =
            pendingSamplesQuery.in(
              "project_id",
              branchProjectIds
            );
        }
      }

      /*
       * =====================================================
       * RECENT SAMPLES
       * =====================================================
       */

      let recentSamplesQuery = supabase
        .from("samples")
        .select(
          "id, sample_number, sample_type, status, received_date, project_id"
        )
        .order("id", {
          ascending: false,
        })
        .limit(5);

      if (effectiveBranchId !== null) {
        if (branchProjectIds.length === 0) {
          recentSamplesQuery =
            recentSamplesQuery.eq("id", -1);
        } else {
          recentSamplesQuery =
            recentSamplesQuery.in(
              "project_id",
              branchProjectIds
            );
        }
      }

      /*
       * =====================================================
       * RUN
       * =====================================================
       */

      const [
        clientsResult,
        projectsResult,
        testsResult,
        samplesResult,
        pendingSamplesResult,
        recentSamplesResult,
      ] = await Promise.all([
        clientsQuery,
        projectsQuery,
        testsQuery,
        samplesQuery,
        pendingSamplesQuery,
        recentSamplesQuery,
      ]);

      /*
       * =====================================================
       * ERRORS
       * =====================================================
       */

      if (clientsResult.error) {
        console.error(
          "DASHBOARD CLIENTS ERROR:",
          clientsResult.error
        );
      }

      if (projectsResult.error) {
        console.error(
          "DASHBOARD PROJECTS ERROR:",
          projectsResult.error
        );
      }

      if (testsResult.error) {
        console.error(
          "DASHBOARD TESTS ERROR:",
          testsResult.error
        );
      }

      if (samplesResult.error) {
        console.error(
          "DASHBOARD SAMPLES ERROR:",
          samplesResult.error
        );
      }

      if (pendingSamplesResult.error) {
        console.error(
          "DASHBOARD PENDING SAMPLES ERROR:",
          pendingSamplesResult.error
        );
      }

      if (recentSamplesResult.error) {
        console.error(
          "DASHBOARD RECENT SAMPLES ERROR:",
          recentSamplesResult.error
        );
      }

      /*
       * =====================================================
       * SET DATA
       * =====================================================
       */

      setClientsCount(clientsResult.count || 0);
      setProjectsCount(projectsResult.count || 0);
      setTestsCount(testsResult.count || 0);
      setSamplesCount(samplesResult.count || 0);
      setPendingSamplesCount(
        pendingSamplesResult.count || 0
      );
      setRecentSamples(
        recentSamplesResult.data || []
      );

      console.log("DASHBOARD COUNTS:", {
        role,
        effectiveBranchId,
        clients: clientsResult.count,
        projects: projectsResult.count,
        tests: testsResult.count,
        samples: samplesResult.count,
        pendingSamples: pendingSamplesResult.count,
      });
    } catch (error) {
      console.error(
        "DASHBOARD LOAD ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  const logout = async () => {
    await supabase.auth.signOut();
    clearSavedUser();
    router.push("/");
  };

  const isAdmin =
    String(user?.role || "")
      .trim()
      .toLowerCase() === "admin";

  const isBranchManager =
    String(user?.role || "")
      .trim()
      .toLowerCase() === "branch_manager";

  const selectedBranchName =
    selectedBranchId === null
      ? "كل الفروع"
      : BRANCHES.find(
          (branch) => branch.id === selectedBranchId
        )?.name || "الفرع";

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen bg-gray-100">

        <Sidebar user={user} />

        <section className="flex-1 p-8">

          {/* HEADER */}

          <div className="flex justify-between items-start mb-8">

            <div>

              <h2 className="text-3xl font-bold">
                Dashboard
              </h2>

              {user && (
                <p className="text-gray-500 mt-2">
                  Welcome {user.full_name} | Role:{" "}
                  {user.role}
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

          {/* ============================= */}
          {/* ADMIN BRANCH FILTER */}
          {/* ============================= */}

          {isAdmin && (
            <div className="bg-white rounded-xl shadow p-5 mb-8">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                <div>
                  <h3 className="font-bold text-lg">
                    Branch View
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    اختر الفرع الذي تريد عرض بياناته
                  </p>
                </div>

                <div className="flex items-center gap-3">

                  <select
                    value={
                      selectedBranchId === null
                        ? "all"
                        : String(selectedBranchId)
                    }
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "all") {
                        setSelectedBranchId(null);
                      } else {
                        setSelectedBranchId(
                          Number(value)
                        );
                      }
                    }}
                    className="border border-gray-300 rounded-lg px-4 py-3 min-w-[220px] bg-white font-semibold"
                  >

                    <option value="all">
                      🌍 كل الفروع
                    </option>

                    {BRANCHES.map((branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                      </option>
                    ))}

                  </select>

                </div>

              </div>

              <div className="mt-4 inline-flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold">
                📍 العرض الحالي: {selectedBranchName}
              </div>

            </div>
          )}

          {/* ============================= */}
          {/* BRANCH MANAGER CURRENT BRANCH */}
          {/* ============================= */}

          {isBranchManager && (
            <div className="bg-white rounded-xl shadow p-5 mb-8">

              <div className="flex items-center gap-3">

                <div className="text-2xl">
                  📍
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Branch
                  </p>

                  <p className="font-bold text-lg">
                    {BRANCHES.find(
                      (branch) =>
                        branch.id === user?.branch_id
                    )?.name ||
                      `Branch ${user?.branch_id || ""}`}
                  </p>
                </div>

              </div>

            </div>
          )}

          {loading ? (

            <div className="bg-white p-8 rounded-xl shadow">
              Loading...
            </div>

          ) : (

            <>

              {/* ============================= */}
              {/* COUNTS */}
              {/* ============================= */}

              <div className="grid grid-cols-2 xl:grid-cols-5 gap-6">

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

                <div className="bg-white rounded-xl shadow p-6">

                  <h3 className="text-gray-500 text-sm">
                    ⏳ Pending
                  </h3>

                  <p className="text-4xl font-bold mt-3">
                    {pendingSamplesCount}
                  </p>

                </div>

              </div>

              {/* ============================= */}
              {/* LOWER SECTION */}
              {/* ============================= */}

              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mt-8">

                {/* RECENT SAMPLES */}

                <div className="bg-white rounded-xl shadow p-6">

                  <div className="flex items-center justify-between mb-4">

                    <h3 className="text-xl font-bold">
                      Recent Samples
                    </h3>

                    <button
                      onClick={() =>
                        router.push("/samples")
                      }
                      className="text-sm text-blue-700 font-semibold"
                    >
                      View all
                    </button>

                  </div>

                  <div className="space-y-3">

                    {recentSamples.length === 0 ? (

                      <p className="text-gray-500">
                        No samples yet.
                      </p>

                    ) : (

                      recentSamples.map(
                        (sample) => (

                          <div
                            key={sample.id}
                            className="flex items-center justify-between border rounded-lg p-3"
                          >

                            <div>

                              <p className="font-semibold">
                                {sample.sample_number ||
                                  `Sample #${sample.id}`}
                              </p>

                              <p className="text-sm text-gray-500">
                                {sample.sample_type ||
                                  "Unknown type"}
                              </p>

                            </div>

                            <div className="text-right">

                              <p className="text-sm font-medium">
                                {sample.status ||
                                  "Pending"}
                              </p>

                              <p className="text-xs text-gray-400">
                                {sample.received_date ||
                                  "-"}
                              </p>

                            </div>

                          </div>

                        )
                      )

                    )}

                  </div>

                </div>

                {/* QUICK ACTIONS */}

                <div className="bg-white rounded-xl shadow p-6">

                  <h3 className="text-xl font-bold mb-4">
                    Quick Actions
                  </h3>

                  <div className="space-y-3">

                    <button
                      onClick={() =>
                        router.push("/samples")
                      }
                      className="w-full text-left rounded-lg border p-3 hover:bg-blue-50"
                    >
                      🧪 Manage Samples
                    </button>

                    <button
                      onClick={() =>
                        router.push("/clients")
                      }
                      className="w-full text-left rounded-lg border p-3 hover:bg-blue-50"
                    >
                      👥 Manage Clients
                    </button>

                    <button
                      onClick={() =>
                        router.push("/projects")
                      }
                      className="w-full text-left rounded-lg border p-3 hover:bg-blue-50"
                    >
                      📁 Manage Projects
                    </button>

                    <button
                      onClick={() =>
                        router.push("/tests")
                      }
                      className="w-full text-left rounded-lg border p-3 hover:bg-blue-50"
                    >
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