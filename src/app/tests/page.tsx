
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AddTestModal from "@/components/AddTestModal";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

export default function TestsPage() {
  const router = useRouter();

  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    setLoading(true);

    try {
      const currentUser = getSavedUser();
console.log("CURRENT USER:", currentUser);
      if (!currentUser) {
        router.push("/");
        return;
      }

      let query = supabase
        .from("tests")
        .select("*")
        .order("test_name", {
          ascending: true,
        });

      if (currentUser.role === "branch_manager") {
        if (!currentUser.branch_id) {
          alert(
            "مدير الفرع غير مرتبط بأي فرع."
          );

          setTests([]);
          return;
        }

        query = query.eq(
          "branch_id",
          Number(currentUser.branch_id)
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error(
          "LOAD TESTS ERROR:",
          error
        );

        alert(error.message);
        setTests([]);
        return;
      }

      setTests(data || []);

      console.log(
        "TESTS FILTER:",
        {
          role: currentUser.role,
          branch_id: currentUser.branch_id,
          count: data?.length || 0,
        }
      );
    } catch (error: any) {
      console.error(
        "LOAD TESTS EXCEPTION:",
        error
      );

      alert(
        error?.message ||
          "حدث خطأ أثناء تحميل الاختبارات."
      );

      setTests([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTest(id: number) {
    const currentUser = getSavedUser();

    if (!currentUser) {
      alert(
        "لم يتم التعرف على المستخدم الحالي."
      );
      return;
    }

    if (
      currentUser.role ===
      "branch_manager"
    ) {
      const test = tests.find(
        (item) =>
          Number(item.id) === Number(id)
      );

      if (!test) {
        alert("الاختبار غير موجود.");
        return;
      }

      if (
        !currentUser.branch_id ||
        Number(test.branch_id) !==
          Number(currentUser.branch_id)
      ) {
        alert(
          "لا يمكنك حذف اختبار تابع لفرع آخر."
        );
        return;
      }
    }

    const confirmDelete = confirm(
      "هل أنت متأكد من حذف هذا الاختبار؟"
    );

    if (!confirmDelete) return;

    let query = supabase
      .from("tests")
      .delete()
      .eq("id", id);

    if (
      currentUser.role ===
      "branch_manager"
    ) {
      query = query.eq(
        "branch_id",
        Number(currentUser.branch_id)
      );
    }

    const { error } = await query;

    if (error) {
      console.error(
        "DELETE TEST ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    await loadTests();
  }

  return (
    <ProtectedRoute>
      <div className="p-8 min-h-screen bg-gray-100">

        <div className="max-w-6xl mx-auto">

          <div className="flex justify-between items-center mb-6">

            <div className="flex items-center gap-3">

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
                ← Back
              </button>

              <div>

                <h1 className="text-3xl font-bold text-blue-900">
                  Tests
                </h1>

                <p className="text-gray-600 mt-2">
                  {getSavedUser()?.role ===
                  "branch_manager"
                    ? "Manage tests for your branch"
                    : "Manage all laboratory tests"}
                </p>

              </div>

            </div>

            <button
              onClick={() => {
                setSelectedTest(null);
                setOpenModal(true);
              }}
              className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
            >
              + Add Test
            </button>

          </div>

          {loading ? (

            <div className="bg-white rounded-xl shadow p-6 text-center">
              Loading...
            </div>

          ) : tests.length === 0 ? (

            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
              No tests found
            </div>

          ) : (

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {tests.map((test) => (

                <div
                  key={test.id}
                  className="bg-white rounded-xl shadow p-5"
                >

                  <div className="flex justify-between items-start">

                    <div>

                      <h2 className="text-xl font-semibold text-gray-800">
                        {test.test_name}
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Test ID: {test.id}
                      </p>

                      {test.category && (
                        <p className="text-sm text-gray-500 mt-1">
                          Category: {test.category}
                        </p>
                      )}

                      {test.standard && (
                        <p className="text-sm text-gray-500">
                          Standard: {test.standard}
                        </p>
                      )}

                      {test.unit && (
                        <p className="text-sm text-gray-500">
                          Unit: {test.unit}
                        </p>
                      )}

                    </div>

                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                      Active
                    </span>

                  </div>

                  <div className="flex gap-2 mt-6">

                    <button
                      onClick={() => {
                        setSelectedTest(test);
                        setOpenModal(true);
                      }}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        deleteTest(
                          Number(test.id)
                        )
                      }
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                    >
                      Delete
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

        <AddTestModal
          open={openModal}
          test={selectedTest}
          onClose={() => {
            setOpenModal(false);
            setSelectedTest(null);
          }}
          onSaved={() => {
            loadTests();
          }}
        />

      </div>
    </ProtectedRoute>
  );
}

