"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  open: boolean;
  sampleId: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddTestToSampleModal({
  open,
  sampleId,
  onClose,
  onSaved,
}: Props) {
  const [tests, setTests] = useState<any[]>([]);
  const [testId, setTestId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadTests();
    }
  }, [open]);

  async function loadTests() {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .order("test_name");

    if (!error) {
      setTests(data || []);
    }
  }

  async function saveTest() {
    if (!testId) {
      alert("Please select a test");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("sample_tests")
      .insert([
        {
          sample_id: sampleId,
          test_id: Number(testId),
          status: "Pending",
        },
      ]);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[500px] p-8">
        <h2 className="text-2xl font-bold mb-6">
          Add Test
        </h2>

        <select
          className="w-full border rounded-lg p-3 mb-6"
          value={testId}
          onChange={(e) => setTestId(e.target.value)}
        >
          <option value="">Select Test</option>

          {tests.map((test) => (
            <option
              key={test.id}
              value={test.id}
            >
              {test.test_name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={saveTest}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
