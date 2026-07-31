"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [testName, setTestName] = useState("");
  const [category, setCategory] = useState("");
  const [standard, setStandard] = useState("");
  const [unit, setUnit] = useState("");

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setTests(data || []);
    setLoading(false);
  }

  async function addTest() {
    if (!testName) {
      alert("Enter test name");
      return;
    }

    const { error } = await supabase
      .from("tests")
      .insert([
        {
          test_name: testName,
          category,
          standard,
          unit,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setTestName("");
    setCategory("");
    setStandard("");
    setUnit("");

    loadTests();
  }

  async function deleteTest(id: number) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this test?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("tests")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadTests();
  }

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold mb-8">
        Tests
      </h1>

      <div className="bg-white rounded-xl shadow p-6 mb-8">

        <h2 className="text-xl font-bold mb-4">
          Add New Test
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <input
            className="border rounded-lg p-3"
            placeholder="Test Name"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
          />

          <input
            className="border rounded-lg p-3"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <input
            className="border rounded-lg p-3"
            placeholder="Standard"
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
          />

          <input
            className="border rounded-lg p-3"
            placeholder="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />

        </div>

        <button
          onClick={addTest}
          className="mt-5 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg"
        >
          + Add Test
        </button>

      </div>


      <div className="bg-white rounded-xl shadow overflow-hidden">

        {loading ? (
          <div className="p-6 text-center">
            Loading tests...
          </div>
        ) : tests.length === 0 ? (
          <div className="p-6 text-center">
            No tests found
          </div>
        ) : (

          <table className="w-full">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Test Name</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Standard</th>
                <th className="p-3 text-left">Unit</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>

              {tests.map((test) => (

                <tr
                  key={test.id}
                  className="border-t"
                >

                  <td className="p-3">
                    {test.test_name}
                  </td>

                  <td className="p-3">
                    {test.category}
                  </td>

                  <td className="p-3">
                    {test.standard}
                  </td>

                  <td className="p-3">
                    {test.unit}
                  </td>

                  <td className="p-3">

                    <button
                      onClick={() => deleteTest(test.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

    </div>
  );
}
