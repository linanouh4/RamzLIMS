"use client";

import { useUiText } from "@/lib/uiText";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import AddTestToSampleModal from "@/components/AddTestToSampleModal";
import AddResultModal from "@/components/AddResultModal";

export default function SampleDetailsPage() {
  const ui = useUiText();

  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sample, setSample] = useState<any>(null);
  const [sampleTests, setSampleTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportFile, setReportFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const [openAddTest, setOpenAddTest] = useState(false);

  const [openResult, setOpenResult] = useState(false);

  const [selectedSampleTest, setSelectedSampleTest] =
    useState<number | null>(null);

  const [selectedResult, setSelectedResult] =
    useState<any>(null);

  useEffect(() => {

    if (id) {

      loadSample();
      loadUploadedReport();

    }

  }, [id]);

  function loadUploadedReport() {
    try {
      const raw = localStorage.getItem("ramzlims-report-uploads");
      if (!raw) {
        setReportFile(null);
        return;
      }

      const parsed = JSON.parse(raw);
      const saved = parsed[id];
      setReportFile(saved || null);
    } catch {
      setReportFile(null);
    }
  }

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
      .select("id, status, test_id")
      .eq("sample_id", id);

    if (testsError) {
      alert(testsError.message);
      setLoading(false);
      return;
    }

    const sampleTestIds = (tests || []).map((item: any) => item.id);
    let resultsData: any[] = [];

    if (sampleTestIds.length > 0) {
      const { data: fetchedResults, error: resultsError } = await supabase
        .from("test_results")
        .select("id, result_value, unit, notes, sample_test_id")
        .in("sample_test_id", sampleTestIds);

      if (resultsError) {
        alert(resultsError.message);
      }

      resultsData = fetchedResults || [];
    }

    const resultsBySampleTestId = new Map<number, any[]>();
    resultsData.forEach((result: any) => {
      const list = resultsBySampleTestId.get(result.sample_test_id) || [];
      list.push(result);
      resultsBySampleTestId.set(result.sample_test_id, list);
    });

    const sampleTestsWithResults = await Promise.all(
      (tests || []).map(async (item: any) => {
        const { data: test } = await supabase
          .from("tests")
          .select("test_name")
          .eq("id", item.test_id)
          .single();

        return {
          ...item,
          tests: test,
          results: resultsBySampleTestId.get(item.id) || [],
        };
      })
    );

    setSampleTests(sampleTestsWithResults);

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
      ui("Delete this test?")
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
      ui("Delete this result?")
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

  function handleReportUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert(ui("Please upload a PDF or image file."));
      return;
    }

    setUploading(true);
    setUploadMessage("");

    const reader = new FileReader();
    reader.onload = () => {
      const uploadedFile = {
        id: Date.now(),
        name: file.name,
        type: file.type,
        data: reader.result as string,
        uploadedAt: new Date().toLocaleString(),
      };

      try {
        const raw = localStorage.getItem("ramzlims-report-uploads");
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[id] = uploadedFile;
        localStorage.setItem("ramzlims-report-uploads", JSON.stringify(parsed));
        setReportFile(uploadedFile);
        setUploadMessage("Report uploaded successfully.");
      } catch {
        alert(ui("Failed to save report file."));
      } finally {
        setUploading(false);
      }
    };

    reader.onerror = () => {
      setUploading(false);
      alert(ui("Failed to read the selected file."));
    };

    reader.readAsDataURL(file);
  }

  function removeReportFile() {
    try {
      const raw = localStorage.getItem("ramzlims-report-uploads");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      delete parsed[id];
      localStorage.setItem("ramzlims-report-uploads", JSON.stringify(parsed));
      setReportFile(null);
      setUploadMessage("Report removed.");
    } catch {
      alert(ui("Failed to remove report."));
    }
  }

  if (loading) {

    return (

      <div className="p-8 text-center">
        {ui("Loading...")}
      </div>

    );

  }

  if (!sample) {

    return (

      <div className="p-8 text-center">
        {ui("Sample not found")}
      </div>

    );

  }

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/samples"
            replace
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {ui("← Back to Samples")}
          </Link>
          <h1 className="text-3xl font-bold">
            {ui("Sample Details")}
          </h1>
        </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8">

        <div className="grid grid-cols-2 gap-4">

          <div>
            <strong>{ui("Sample Number:")}</strong>
            <br />
            {sample.sample_number}
          </div>

          <div>
            <strong>{ui("Sample Type:")}</strong>
            <br />
            {sample.sample_type}
          </div>

          <div>
            <strong>{ui("Received Date:")}</strong>
            <br />
            {sample.received_date}
          </div>

          <div>
            <strong>{ui("Received By:")}</strong>
            <br />
            {sample.received_by}
          </div>

          <div>
            <strong>{ui("Status:")}</strong>
            <br />
            {ui(sample.status)}
          </div>

          <div>
            <strong>{ui("Condition:")}</strong>
            <br />
            {sample.received_condition}
          </div>

          <div className="col-span-2">
            <strong>{ui("Notes:")}</strong>
            <br />
            {sample.notes || "-"}
          </div>

        </div>

      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{ui("Report File")}</h2>
            <p className="text-gray-500 text-sm">{ui("Upload the final PDF or image report for this sample.")}</p>
          </div>

          <label className="cursor-pointer rounded-lg bg-blue-700 px-5 py-2 text-white hover:bg-blue-800">
            {uploading ? ui("Uploading...") : ui("Upload Report")}
            <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleReportUpload} />
          </label>
        </div>

        {uploadMessage ? <p className="mt-3 text-sm text-green-700">{uploadMessage}</p> : null}

        {reportFile ? (
          <div className="mt-5 rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{reportFile.name}</p>
                <p className="text-sm text-gray-500">{ui("Uploaded:")} {reportFile.uploadedAt}</p>
              </div>
              <button onClick={removeReportFile} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                {ui("Remove")}
              </button>
            </div>

            {reportFile.type?.includes("pdf") ? (
              <iframe src={reportFile.data} title={ui("Uploaded report")} className="h-[500px] w-full rounded-lg border" />
            ) : (
              <img src={reportFile.data} alt={ui("Uploaded report preview")} className="max-h-[500px] w-full rounded-lg border object-contain" />
            )}
          </div>
        ) : (
          <p className="mt-4 text-gray-500">{ui("No report file uploaded yet.")}</p>
        )}
      </div>

            <div className="bg-white rounded-xl shadow p-6">

        <div className="flex justify-between items-center mb-5">

          <h2 className="text-2xl font-bold">
            {ui("Tests")}
          </h2>

          <div className="flex gap-3">

  <button
    onClick={() => router.push(`/reports/${id}`)}
    className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg"
  >
    {ui("View Report")}
  </button>

  <button
    onClick={() => setOpenAddTest(true)}
    className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
  >
    {ui("+ Add Test")}
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

                    {item.tests?.test_name || ui("Unknown Test")}

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
                      {ui("Pending")}
                    </option>

                    <option value="In Progress">
                      {ui("In Progress")}
                    </option>

                    <option value="Completed">
                      {ui("Completed")}
                    </option>

                  </select>

                </div>

                <button
                  onClick={() =>
                    deleteTest(item.id)
                  }
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  {ui("Delete Test")}
                </button>

              </div>

              <div className="mt-4">

                <strong>
                  {ui("Results:")}
                </strong>

                {item.results?.length === 0 ? (

                  <p className="text-gray-500 mt-2">
                    {ui("No results yet")}
                  </p>

                ) : (

                  item.results?.map((result:any) => (

                    <div

                      key={result.id}

                      className="mt-2 bg-gray-100 p-3 rounded flex justify-between"

                    >

                      <div>

                        <div>
                          {ui("Value:")} {result.result_value}
                        </div>

                        <div>
                          {ui("Unit:")} {result.unit || "-"}
                        </div>

                        <div>
                          {ui("Notes:")} {result.notes || "-"}
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

                          {ui("Edit")}

                        </button>

                        <button

                          onClick={() =>
                            deleteResult(result.id)
                          }

                          className="bg-red-600 text-white px-3 py-2 rounded"

                        >

                          {ui("Delete")}

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

                {ui("+ Add Result")}

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
    </ProtectedRoute>

  );

}
