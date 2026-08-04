"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AddTestModal from "@/components/AddTestModal";
import { supabase } from "@/lib/supabase";

const TESTS_STORAGE_KEY = "ramzlims-tests";

function getStoredTests() {
  try {
    const raw = localStorage.getItem(TESTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredTests(tests: any[]) {
  localStorage.setItem(TESTS_STORAGE_KEY, JSON.stringify(tests));
}

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
      const { data, error } = await supabase.from("tests").select("*").order("test_name");

      if (!error && data) {
        setTests(data || []);
        saveStoredTests(data || []);
      } else {
        setTests(getStoredTests());
      }
    } catch {
      setTests(getStoredTests());
    }

    setLoading(false);
  }

  async function deleteTest(id: number) {
    const confirmDelete = confirm("Delete this test?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    loadTests();
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
                <h1 className="text-3xl font-bold text-blue-900">Tests</h1>
                <p className="text-gray-600 mt-2">Manage available laboratory tests</p>
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
            <div className="bg-white rounded-xl shadow p-6 text-center">Loading...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tests.map((test) => (
                <div key={test.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">{test.test_name}</h2>
                      <p className="text-sm text-gray-500 mt-1">Test ID: {test.id}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">Active</span>
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
                      onClick={() => deleteTest(test.id)}
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
          onClose={() => setOpenModal(false)}
          onSaved={() => {
            setOpenModal(false);
            loadTests();
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
