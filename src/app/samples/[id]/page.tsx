"use client";

import { useParams, useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AddTestToSampleModal from "@/components/AddTestToSampleModal";
import AddResultModal from "@/components/AddResultModal";

export default function SampleDetailsPage() {

  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sample, setSample] = useState<any>(null);
  const [sampleTests, setSampleTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openAddTest, setOpenAddTest] = useState(false);

  const [openResult, setOpenResult] = useState(false);

  const [selectedSampleTest, setSelectedSampleTest] =
    useState<number | null>(null);

  const [selectedResult, setSelectedResult] =
    useState<any>(null);

  useEffect(() => {

    if (id) {

      loadSample();

    }

  }, [id]);

  async function loadSample() {

    setLoading(true);

    const { data, error } = await supabase
      .from("samples")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {

      alert(error.message);

      setLoading(false);

      return;

    }

    setSample(data);

    const { data: tests, error: testsError } = await supabase
      .from("sample_tests")
      .select(`
        id,
        status,
        tests (
          test_name
        ),
        test_results (
          id,
          result_value,
          unit,
          notes
        )
      `)
      .eq("sample_id", id);

    if (testsError) {

      alert(testsError.message);

    }

    setSampleTests(tests || []);

    setLoading(false);

  }

  async function updateStatus(
    testId:number,
    status:string
  ) {

    const { error } = await supabase
      .from("sample_tests")
      .update({
        status,
      })
      .eq("id", testId);

    if (error) {

      alert(error.message);

      return;

    }

    loadSample();

  }

  async function deleteTest(testId:number) {

    const confirmDelete = confirm(
      "Delete this test?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("sample_tests")
      .delete()
      .eq("id", testId);

    if (error) {

      alert(error.message);

      return;

    }

    loadSample();

  }

  async function deleteResult(resultId:number) {

    const confirmDelete = confirm(
      "Delete this result?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("test_results")
      .delete()
      .eq("id", resultId);

    if (error) {

      alert(error.message);

      return;

    }

    loadSample();

  }

  if (loading) {

    return (

      <div className="p-8 text-center">
        Loading...
      </div>

    );

  }

  if (!sample) {

    return (

      <div className="p-8 text-center">
        Sample not found
      </div>

    );

  }

  return (

    <div className="p-8">

      <h1 className="text-3xl font-bold mb-8">
        Sample Details
      </h1>

      <div className="bg-white rounded-xl shadow p-6 mb-8">

        <div className="grid grid-cols-2 gap-4">

          <div>
            <strong>Sample Number:</strong>
            <br />
            {sample.sample_number}
          </div>

          <div>
            <strong>Sample Type:</strong>
            <br />
            {sample.sample_type}
          </div>

          <div>
            <strong>Received Date:</strong>
            <br />
            {sample.received_date}
          </div>

          <div>
            <strong>Received By:</strong>
            <br />
            {sample.received_by}
          </div>

          <div>
            <strong>Status:</strong>
            <br />
            {sample.status}
          </div>

          <div>
            <strong>Condition:</strong>
            <br />
            {sample.received_condition}
          </div>

          <div className="col-span-2">
            <strong>Notes:</strong>
            <br />
            {sample.notes || "-"}
          </div>

        </div>

      </div>
            <div className="bg-white rounded-xl shadow p-6">

        <div className="flex justify-between items-center mb-5">

          <h2 className="text-2xl font-bold">
            Tests
          </h2>

          <div className="flex gap-3">

  <button
    onClick={() => router.push(`/reports/${id}`)}
    className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg"
  >
    View Report
  </button>

  <button
    onClick={() => setOpenAddTest(true)}
    className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
  >
    + Add Test
  </button>

</div>

        </div>

        <div className="space-y-4">

          {sampleTests.map((item) => (

            <div
              key={item.id}
              className="border rounded-lg p-4"
            >

              <div className="flex justify-between items-center">

                <div>

                  <div className="font-bold text-lg">

                    {item.tests?.test_name || "Unknown Test"}

                  </div>

                  <select

                    className="mt-2 border rounded p-2"

                    value={item.status || "Pending"}

                    onChange={(e) =>
                      updateStatus(
                        item.id,
                        e.target.value
                      )
                    }

                  >

                    <option value="Pending">
                      Pending
                    </option>

                    <option value="In Progress">
                      In Progress
                    </option>

                    <option value="Completed">
                      Completed
                    </option>

                  </select>

                </div>

                <button
                  onClick={() =>
                    deleteTest(item.id)
                  }
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete Test
                </button>

              </div>

              <div className="mt-4">

                <strong>
                  Results:
                </strong>

                {item.test_results?.length === 0 ? (

                  <p className="text-gray-500 mt-2">
                    No results yet
                  </p>

                ) : (

                  item.test_results?.map((result:any) => (

                    <div

                      key={result.id}

                      className="mt-2 bg-gray-100 p-3 rounded flex justify-between"

                    >

                      <div>

                        <div>
                          Value: {result.result_value}
                        </div>

                        <div>
                          Unit: {result.unit || "-"}
                        </div>

                        <div>
                          Notes: {result.notes || "-"}
                        </div>

                      </div>

                      <div className="flex gap-2">

                        <button

                          onClick={() => {

                            setSelectedSampleTest(item.id);

                            setSelectedResult(result);

                            setOpenResult(true);

                          }}

                          className="bg-yellow-500 text-white px-3 py-2 rounded"

                        >

                          Edit

                        </button>

                        <button

                          onClick={() =>
                            deleteResult(result.id)
                          }

                          className="bg-red-600 text-white px-3 py-2 rounded"

                        >

                          Delete

                        </button>

                      </div>

                    </div>

                  ))

                )}

              </div>

              <button

                onClick={() => {

                  setSelectedSampleTest(item.id);

                  setSelectedResult(null);

                  setOpenResult(true);

                }}

                className="mt-4 bg-green-600 text-white px-4 py-2 rounded"

              >

                + Add Result

              </button>

            </div>

          ))}

        </div>

      </div>

      {openAddTest && (

        <AddTestToSampleModal

          open={openAddTest}

          sampleId={Number(id)}

          onClose={() =>
            setOpenAddTest(false)
          }

          onSaved={() => {

            setOpenAddTest(false);

            loadSample();

          }}

        />

      )}

      {openResult && selectedSampleTest && (

        <AddResultModal

          open={openResult}

          sampleTestId={selectedSampleTest}

          resultId={selectedResult?.id}

          initialData={selectedResult}

          onClose={() => {

            setOpenResult(false);

            setSelectedResult(null);

          }}

          onSaved={() => {

            setOpenResult(false);

            setSelectedResult(null);

            loadSample();

          }}

        />

      )}

    </div>

  );

}
