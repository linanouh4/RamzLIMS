"use client";

import { useEffect, useState } from "react";
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

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  test?: { id?: number; test_name?: string } | null;
};

export default function AddTestModal({ open, onClose, onSaved, test }: Props) {
  const [testName, setTestName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTestName(test?.test_name || "");
    }
  }, [open, test]);

  if (!open) return null;

  async function saveTest() {
    const name = testName.trim();

    if (!name) {
      alert("Please enter a test name");
      return;
    }

    setLoading(true);

    let error;

    if (test?.id) {
      const result = await supabase
        .from("tests")
        .update({ test_name: name })
        .eq("id", test.id);

      error = result.error;
    } else {
      const result = await supabase.from("tests").insert([{ test_name: name }]);
      error = result.error;
    }

    setLoading(false);

    if (error) {
        console.error(error);
        alert(error.message);
      const storedTests = getStoredTests();

      if (test?.id) {
        const updated = storedTests.map((item: any) =>
          item.id === test.id ? { ...item, test_name: name } : item
        );
        saveStoredTests(updated);
      } else {
        const newTest = {
          id: Date.now(),
          test_name: name,
        };
        saveStoredTests([...storedTests, newTest]);
      }

      alert("Saved locally because the database rejected the write. The test is still available in the app.");
      onSaved();
      onClose();
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-8">
        <h2 className="text-2xl font-bold mb-6">
          {test ? "Edit Test" : "Add New Test"}
        </h2>

        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-black"
          placeholder="Test name"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
        />

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>

          <button
            onClick={saveTest}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-blue-700 text-white hover:bg-blue-800"
          >
            {loading ? "Saving..." : test ? "Update Test" : "Save Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
