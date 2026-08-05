"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sample, setSample] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadedReport, setUploadedReport] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [approval, setApproval] = useState<any>(null);

  const [preparedBy, setPreparedBy] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
  if (id) {
    loadReport();
    loadUploadedReport();
    loadApproval();
    loadUsers();
  }

  loadCompanyProfile();
}, [id]);
  function loadCompanyProfile() {
    try {
      const saved = localStorage.getItem("ramzlims-company-profile");
      if (saved) {
        setCompanyProfile(JSON.parse(saved));
      }
    } catch {
      // Ignore invalid data
    }
  }

  function loadUploadedReport() {
    try {
      const raw = localStorage.getItem("ramzlims-report-uploads");
      if (!raw) {
        setUploadedReport(null);
        return;
      }

      const parsed = JSON.parse(raw);
      setUploadedReport(parsed[id] || null);
    } catch {
      setUploadedReport(null);
    }
  }
  async function loadUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, role")
    .order("full_name");

  if (error) {
    alert(error.message);
    return;
  }

  setUsers(data || []);
}
async function loadApproval() {

  const { data, error } = await supabase
    .from("report_approvals")
    .select(`
      *,
      prepared_user:users!report_approvals_prepared_by_fkey(full_name,signature),
reviewed_user:users!report_approvals_reviewed_by_fkey(full_name,signature),
approved_user:users!report_approvals_approved_by_fkey(full_name,signature)
    `)
    .eq("sample_id", id)
    .single();


  if (error) {
    return;
  }


  if (data) {

    setApproval(data);

    setPreparedBy(String(data.prepared_by || ""));
    setReviewedBy(String(data.reviewed_by || ""));
    setApprovedBy(String(data.approved_by || ""));

  }

}
async function saveApproval() {

  const approvalData = {
  sample_id: Number(id),
  prepared_by: preparedBy ? Number(preparedBy) : null,
  reviewed_by: reviewedBy ? Number(reviewedBy) : null,
  approved_by: approvedBy ? Number(approvedBy) : null,
  status: "Approved",
};

  let response;

  if (approval) {
    response = await supabase
      .from("report_approvals")
      .update(approvalData)
      .eq("id", approval.id);
  } else {
    response = await supabase
      .from("report_approvals")
      .insert([approvalData]);
  }

  if (response.error) {
    alert(response.error.message);
    return;
  }

  alert("Approval saved successfully");

  loadApproval();
  function getUserName(userId: any) {
  const user = users.find((u: any) => String(u.id) === String(userId));
  return user?.full_name || "-";
}
}
  async function loadReport() {
    setLoading(true);

    const { data: sampleData, error: sampleError } = await supabase
      .from("samples")
      .select("*")
      .eq("id", id)
      .single();

    if (sampleError) {
      alert(sampleError.message);
      setLoading(false);
      return;
    }

    const { data: sampleTests, error: testsError } = await supabase
      .from("sample_tests")
      .select("id, status, test_id")
      .eq("sample_id", id);

    if (testsError) {
      alert(testsError.message);
      setLoading(false);
      return;
    }

    const sampleTestIds = (sampleTests || []).map((item: any) => item.id);
    let resultsData: any[] = [];

    if (sampleTestIds.length > 0) {
      const { data: fetchedResults, error: resultsError } = await supabase
        .from("test_results")
        .select("*")
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

    const testsWithResults = await Promise.all(
      (sampleTests || []).map(async (item: any) => {
       const { data: test } = await supabase
      .from("tests")
      .select("test_name, standard, unit")
      .eq("id", item.test_id)
      .single();

        return {
          ...item,
          tests: test,
          results: resultsBySampleTestId.get(item.id) || [],
        };
      })
    );

    setSample({
      ...sampleData,
      sample_tests: testsWithResults,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading Report...
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="p-8 text-center">Report not found</div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-gray-100 min-h-screen p-8">
        <div className="flex justify-between items-center max-w-5xl mx-auto mb-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg print:hidden"
          >
            🖨️ Print Report
          </button>
        </div>

        <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl p-10">
          <div className="border-b-2 pb-6 mb-8">
            <div className="flex flex-col items-center text-center">
              {companyProfile?.logoData ? (
                <img src={companyProfile.logoData} alt="Company logo" className="mb-3 h-20 w-auto object-contain" />
              ) : null}
              <h1 className="text-4xl font-bold">{companyProfile?.companyName || "شركة رمز الإمارات لفحص التربة والخرسانة"}</h1>
              <p className="text-gray-600 mt-2">{companyProfile?.companyAddress || "RAMZ Emirates Laboratory for Soil & Concrete Testing"}</p>
              <h2 className="text-2xl font-bold mt-6">TEST REPORT</h2>
            </div>
          </div>

          {uploadedReport ? (
            <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-lg font-semibold">Uploaded Report File</h3>
              <p className="mb-3 text-sm text-gray-600">{uploadedReport.name}</p>
              {uploadedReport.type?.includes("pdf") ? (
                <iframe src={uploadedReport.data} title="Uploaded report" className="h-[500px] w-full rounded-lg border" />
              ) : (
                <img src={uploadedReport.data} alt="Uploaded report" className="max-h-[500px] w-full rounded-lg border object-contain" />
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div>
              <strong>Report Number</strong>
              <br />
              RPT-{sample.id}
            </div>
            <div>
              <strong>Sample Number</strong>
              <br />
              {sample.sample_number}
            </div>
            <div>
              <strong>Sample Type</strong>
              <br />
              {sample.sample_type}
            </div>
            <div>
              <strong>Received Date</strong>
              <br />
              {sample.received_date}
            </div>
            <div>
              <strong>Status</strong>
              <br />
              {sample.status}
            </div>
          </div>

          <table className="w-full border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-3">Test</th>
                <th className="border p-3">Standard</th>
                <th className="border p-3">Status</th>
                <th className="border p-3">Result</th>
                <th className="border p-3">Unit</th>
                <th className="border p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sample.sample_tests?.map((test: any) => {
                const result = test.results?.[0];
                return (
                  <tr key={test.id}>
                    <td className="border p-3">
                   {test.tests?.test_name || "-"}
                 </td>

                  <td className="border p-3">
                 {test.tests?.standard || "-"}
                </td>

                  <td className="border p-3">
                {test.status || "-"}
               </td>
                    <td className="border p-3">{result?.result_value || "-"}</td>
                    <td className="border p-3">{result?.unit || "-"}</td>
                    <td className="border p-3">{result?.notes || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
<div className="mb-10 border rounded-xl p-6 bg-gray-50">

  <h3 className="text-xl font-bold mb-5">
    Quality Approval
  </h3>

  <div className="grid md:grid-cols-3 gap-4">

    <div>
      <label className="block text-sm font-semibold mb-2">
        Prepared By
      </label>

     <select
  className="w-full border rounded-lg p-3"
  value={preparedBy}
  onChange={(e) => setPreparedBy(e.target.value)}
>
  <option value="">Select User</option>

  {users.map((user) => (
    <option key={user.id} value={user.id}>
      {user.full_name}
    </option>
  ))}

</select>
    </div>


    <div>
      <label className="block text-sm font-semibold mb-2">
        Reviewed By
      </label>

      <select
  className="w-full border rounded-lg p-3"
  value={reviewedBy}
  onChange={(e) => setReviewedBy(e.target.value)}
>
  <option value="">Select User</option>

  {users.map((user) => (
    <option key={user.id} value={user.id}>
      {user.full_name}
    </option>
  ))}
</select>

    </div>


    <div>
      <label className="block text-sm font-semibold mb-2">
        Approved By
      </label>

      <select
  className="w-full border rounded-lg p-3"
  value={approvedBy}
  onChange={(e) => setApprovedBy(e.target.value)}
>
  <option value="">Select User</option>

  {users.map((user) => (
    <option key={user.id} value={user.id}>
      {user.full_name}
    </option>
  ))}
</select>
    </div>

  </div>


  <button
    onClick={saveApproval}
    className="mt-5 bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg"
  >
    Save Approval
  </button>
{approval && (
  <div className="mt-5 border-t pt-4 text-sm">

    <p>
      <strong>Status:</strong> {approval.status}
    </p>

   <p>
  <strong>Prepared By:</strong> {approval.prepared_user?.full_name || "-"}
</p>

<p>
  <strong>Reviewed By:</strong> {approval.reviewed_user?.full_name || "-"}
</p>

<p>
  <strong>Approved By:</strong> {approval.approved_user?.full_name || "-"}
</p>
  </div>
)}
</div>
          <div className="grid grid-cols-3 gap-10 mt-20 pt-10 border-t">
           <div className="text-center">
  {approval?.prepared_user?.signature ? (
    <img
      src={approval.prepared_user.signature}
      alt="Prepared Signature"
      className="mx-auto mb-2 h-12 w-auto object-contain"
    />
  ) : (
    <div className="border-b border-black h-12 mb-2" />
  )}

  <p className="font-semibold">
    {approval?.prepared_user?.full_name || "Tested By"}
  </p>
</div>
          <div className="text-center">
  {approval?.reviewed_user?.signature ? (
    <img
      src={approval.reviewed_user.signature}
      alt="Reviewed Signature"
      className="mx-auto mb-2 h-12 w-auto object-contain"
    />
  ) : (
    <div className="border-b border-black h-12 mb-2" />
  )}

  <p className="font-semibold">
    {approval?.reviewed_user?.full_name || "Reviewed By"}
  </p>
</div>
          <div className="text-center">
  {approval?.approved_user?.signature ? (
    <img
      src={approval.approved_user.signature}
      alt="Approved Signature"
      className="mx-auto mb-2 h-12 w-auto object-contain"
    />
  ) : (
    <div className="border-b border-black h-12 mb-2" />
  )}

  <p className="font-semibold">
    {approval?.approved_user?.full_name || "Approved By"}
  </p>
</div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
