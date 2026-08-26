
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

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
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [savingApproval, setSavingApproval] = useState(false);

  /*
   * =========================================================
   * LOAD PAGE
   * =========================================================
   */

  useEffect(() => {
    if (!id) return;

    const savedUser = getSavedUser();

    if (!savedUser) {
      router.replace("/");
      return;
    }

    setCurrentUser(savedUser);

    loadReport();
    loadUploadedReport();
    loadApproval();
    loadUsers();
    loadCompanyProfile();
  }, [id, router]);

  /*
   * =========================================================
   * COMPANY PROFILE
   * =========================================================
   */

  function loadCompanyProfile() {
    try {
      const saved = localStorage.getItem(
        "ramzlims-company-profile"
      );

      if (saved) {
        setCompanyProfile(JSON.parse(saved));
      }
    } catch {
      setCompanyProfile(null);
    }
  }

  /*
   * =========================================================
   * UPLOADED REPORT
   * =========================================================
   */

  function loadUploadedReport() {
    try {
      const raw = localStorage.getItem(
        "ramzlims-report-uploads"
      );

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

  /*
   * =========================================================
   * LOAD USERS
   * =========================================================
   */

  async function loadUsers() {
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, full_name, role, branch_id, signature"
      )
      .order("full_name");

    if (error) {
      console.error("LOAD USERS ERROR:", error);
      alert(error.message);
      return;
    }

    setUsers(data || []);
  }

  /*
   * =========================================================
   * LOAD APPROVAL
   * =========================================================
   */

  async function loadApproval() {
    const { data, error } = await supabase
      .from("report_approvals")
      .select(`
        *,
        prepared_user:users!report_approvals_prepared_by_fkey(
          full_name,
          signature
        ),
        reviewed_user:users!report_approvals_reviewed_by_fkey(
          full_name,
          signature
        ),
        approved_user:users!report_approvals_approved_by_fkey(
          full_name,
          signature
        )
      `)
      .eq("sample_id", id)
      .maybeSingle();

    if (error) {
      console.error("LOAD APPROVAL ERROR:", error);
      return;
    }

    if (data) {
      setApproval(data);

      setPreparedBy(
        String(data.prepared_by || "")
      );

      setReviewedBy(
        String(data.reviewed_by || "")
      );

      setApprovedBy(
        String(data.approved_by || "")
      );
    }
  }

  /*
   * =========================================================
   * CURRENT USER HELPERS
   * =========================================================
   */

  function getCurrentUserRole() {
    return String(
      currentUser?.role || ""
    )
      .trim()
      .toLowerCase();
  }

  function isAdmin() {
    return getCurrentUserRole() === "admin";
  }

  function isBranchManager() {
    return getCurrentUserRole() === "branch_manager";
  }

  /*
   * =========================================================
   * SAVE APPROVAL
   * =========================================================
   */

  async function saveApproval() {
    if (!currentUser) {
      alert("تعذر تحديد المستخدم الحالي.");
      return;
    }

    setSavingApproval(true);

    try {
      const role = getCurrentUserRole();

      /*
       * مهم جدًا:
       *
       * إذا كان المستخدم Branch Manager
       * فلا نأخذ approvedBy من الواجهة.
       *
       * نستخدم ID المستخدم الحالي مباشرة.
       *
       * هذا يمنع مدير الفرع من اختيار شخص آخر
       * كـ Approved By.
       */

      let finalApprovedBy = approvedBy
        ? Number(approvedBy)
        : null;

      if (role === "branch_manager") {
        finalApprovedBy = Number(currentUser.id);

        // نخلي الواجهة نفسها متوافقة مع القيمة الصحيحة
        setApprovedBy(String(currentUser.id));
      }

      const approvalData = {
        sample_id: Number(id),

        prepared_by: preparedBy
          ? Number(preparedBy)
          : null,

        reviewed_by: reviewedBy
          ? Number(reviewedBy)
          : null,

        approved_by: finalApprovedBy,

        status: "Approved",
      };

      console.log(
        "SAVING REPORT APPROVAL:",
        {
          role,
          currentUserId: currentUser.id,
          approvalData,
        }
      );

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
        console.error(
          "SAVE APPROVAL ERROR:",
          response.error
        );

        alert(
          response.error.message ||
            "تعذر حفظ اعتماد التقرير."
        );

        return;
      }

      alert("تم حفظ اعتماد التقرير بنجاح.");

      await loadApproval();
    } catch (error: any) {
      console.error(
        "SAVE APPROVAL EXCEPTION:",
        error
      );

      alert(
        error?.message ||
          "حدث خطأ أثناء حفظ اعتماد التقرير."
      );
    } finally {
      setSavingApproval(false);
    }
  }

  /*
   * =========================================================
   * LOAD REPORT
   * =========================================================
   */

  async function loadReport() {
    setLoading(true);

    try {
      const {
        data: sampleData,
        error: sampleError,
      } = await supabase
        .from("samples")
        .select("*")
        .eq("id", id)
        .single();

      if (sampleError) {
        console.error(
          "LOAD SAMPLE ERROR:",
          sampleError
        );

        alert(sampleError.message);
        setLoading(false);
        return;
      }

      const {
        data: sampleTests,
        error: testsError,
      } = await supabase
        .from("sample_tests")
        .select("id, status, test_id")
        .eq("sample_id", id);

      if (testsError) {
        console.error(
          "LOAD SAMPLE TESTS ERROR:",
          testsError
        );

        alert(testsError.message);
        setLoading(false);
        return;
      }

      const sampleTestIds = (
        sampleTests || []
      ).map(
        (item: any) => item.id
      );

      let resultsData: any[] = [];

      if (sampleTestIds.length > 0) {
        const {
          data: fetchedResults,
          error: resultsError,
        } = await supabase
          .from("test_results")
          .select("*")
          .in(
            "sample_test_id",
            sampleTestIds
          );

        if (resultsError) {
          console.error(
            "LOAD TEST RESULTS ERROR:",
            resultsError
          );

          alert(resultsError.message);
        }

        resultsData = fetchedResults || [];
      }

      const resultsBySampleTestId =
        new Map<number, any[]>();

      resultsData.forEach(
        (result: any) => {
          const list =
            resultsBySampleTestId.get(
              result.sample_test_id
            ) || [];

          list.push(result);

          resultsBySampleTestId.set(
            result.sample_test_id,
            list
          );
        }
      );

      const testsWithResults =
        await Promise.all(
          (sampleTests || []).map(
            async (item: any) => {
              const { data: test } =
                await supabase
                  .from("tests")
                  .select(
                    "test_name, standard, unit"
                  )
                  .eq(
                    "id",
                    item.test_id
                  )
                  .single();

              return {
                ...item,
                tests: test,
                results:
                  resultsBySampleTestId.get(
                    item.id
                  ) || [],
              };
            }
          )
        );

      setSample({
        ...sampleData,
        sample_tests:
          testsWithResults,
      });
    } catch (error) {
      console.error(
        "LOAD REPORT ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading Report...
      </div>
    );
  }

  /*
   * =========================================================
   * REPORT NOT FOUND
   * =========================================================
   */

  if (!sample) {
    return (
      <div className="p-8 text-center">
        Report not found
      </div>
    );
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <ProtectedRoute>
      <div className="bg-gray-100 min-h-screen p-8">

        {/* TOP BUTTONS */}

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

          {/* =====================================================
              HEADER
          ===================================================== */}

          <div className="border-b-2 pb-6 mb-8">

            <div className="flex flex-col items-center text-center">

              {companyProfile?.logoData ? (
                <img
                  src={
                    companyProfile.logoData
                  }
                  alt="Company logo"
                  className="mb-3 h-20 w-auto object-contain"
                />
              ) : null}

              <h1 className="text-4xl font-bold">
                {companyProfile?.companyName ||
                  "شركة رمز الإمارات لفحص التربة والخرسانة"}
              </h1>

              <p className="text-gray-600 mt-2">
                {companyProfile?.companyAddress ||
                  "RAMZ Emirates Laboratory for Soil & Concrete Testing"}
              </p>

              <h2 className="text-2xl font-bold mt-6">
                TEST REPORT
              </h2>

            </div>

          </div>

          {/* =====================================================
              UPLOADED REPORT
          ===================================================== */}

          {uploadedReport ? (
            <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">

              <h3 className="mb-3 text-lg font-semibold">
                Uploaded Report File
              </h3>

              <p className="mb-3 text-sm text-gray-600">
                {uploadedReport.name}
              </p>

              {uploadedReport.type?.includes(
                "pdf"
              ) ? (
                <iframe
                  src={
                    uploadedReport.data
                  }
                  title="Uploaded report"
                  className="h-[500px] w-full rounded-lg border"
                />
              ) : (
                <img
                  src={
                    uploadedReport.data
                  }
                  alt="Uploaded report"
                  className="max-h-[500px] w-full rounded-lg border object-contain"
                />
              )}

            </div>
          ) : null}

          {/* =====================================================
              REPORT INFORMATION
          ===================================================== */}

          <div className="grid grid-cols-2 gap-6 mb-10">

            <div>
              <strong>
                Report Number
              </strong>
              <br />
              RPT-{sample.id}
            </div>

            <div>
              <strong>
                Sample Number
              </strong>
              <br />
              {sample.sample_number}
            </div>

            <div>
              <strong>
                Sample Type
              </strong>
              <br />
              {sample.sample_type}
            </div>

            <div>
              <strong>
                Received Date
              </strong>
              <br />
              {sample.received_date}
            </div>

            <div>
              <strong>
                Status
              </strong>
              <br />
              {sample.status}
            </div>

          </div>

          {/* =====================================================
              TEST RESULTS
          ===================================================== */}

          <table className="w-full border border-gray-300">

            <thead className="bg-gray-200">

              <tr>

                <th className="border p-3">
                  Test
                </th>

                <th className="border p-3">
                  Standard
                </th>

                <th className="border p-3">
                  Status
                </th>

                <th className="border p-3">
                  Result
                </th>

                <th className="border p-3">
                  Unit
                </th>

                <th className="border p-3">
                  Notes
                </th>

              </tr>

            </thead>

            <tbody>

              {sample.sample_tests?.map(
                (test: any) => {
                  const result =
                    test.results?.[0];

                  return (
                    <tr key={test.id}>

                      <td className="border p-3">
                        {test.tests
                          ?.test_name ||
                          "-"}
                      </td>

                      <td className="border p-3">
                        {test.tests
                          ?.standard ||
                          "-"}
                      </td>

                      <td className="border p-3">
                        {test.status ||
                          "-"}
                      </td>

                      <td className="border p-3">
                        {result?.result_value ||
                          "-"}
                      </td>

                      <td className="border p-3">
                        {result?.unit ||
                          "-"}
                      </td>

                      <td className="border p-3">
                        {result?.notes ||
                          "-"}
                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

          {/* =====================================================
              QUALITY APPROVAL
          ===================================================== */}

          <div className="mb-10 border rounded-xl p-6 bg-gray-50">

            <h3 className="text-xl font-bold mb-5">
              Quality Approval
            </h3>

            <div className="grid md:grid-cols-3 gap-4">

              {/* =================================================
                  PREPARED BY
              ================================================= */}

              <div>

                <label className="block text-sm font-semibold mb-2">
                  Prepared By
                </label>

                <select
                  className="w-full border rounded-lg p-3"
                  value={preparedBy}
                  onChange={(e) =>
                    setPreparedBy(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Select User
                  </option>

                  {users.map(
                    (user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.full_name}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* =================================================
                  REVIEWED BY
              ================================================= */}

              <div>

                <label className="block text-sm font-semibold mb-2">
                  Reviewed By
                </label>

                <select
                  className="w-full border rounded-lg p-3"
                  value={reviewedBy}
                  onChange={(e) =>
                    setReviewedBy(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Select User
                  </option>

                  {users.map(
                    (user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.full_name}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* =================================================
                  APPROVED BY
              ================================================= */}

              <div>

                <label className="block text-sm font-semibold mb-2">
                  Approved By
                </label>

                {isBranchManager() ? (

                  /*
                   * =================================================
                   * BRANCH MANAGER
                   *
                   * لا توجد قائمة اختيار.
                   * يعتمد باسمه هو فقط.
                   * =================================================
                   */

                  <div className="w-full border rounded-lg p-3 bg-gray-100 text-gray-700">

                    {currentUser?.full_name ||
                      "Current User"}

                  </div>

                ) : (

                  /*
                   * =================================================
                   * ADMIN / TECHNICAL MANAGER /
                   * QUALITY MANAGER
                   *
                   * يستطيعون الاختيار.
                   * =================================================
                   */

                  <select
                    className="w-full border rounded-lg p-3"
                    value={approvedBy}
                    onChange={(e) =>
                      setApprovedBy(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select User
                    </option>

                    {users.map(
                      (user) => (
                        <option
                          key={user.id}
                          value={user.id}
                        >
                          {user.full_name}
                        </option>
                      )
                    )}

                  </select>

                )}

              </div>

            </div>

            {/* CURRENT USER INFO */}

            {isBranchManager() && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">

                سيتم اعتماد التقرير باسم:
                <strong className="mr-1">
                  {currentUser?.full_name}
                </strong>

              </div>
            )}

            {/* SAVE */}

            <button
              onClick={saveApproval}
              disabled={savingApproval}
              className="mt-5 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
            >
              {savingApproval
                ? "Saving..."
                : "Save Approval"}
            </button>

            {/* EXISTING APPROVAL */}

            {approval && (
              <div className="mt-5 border-t pt-4 text-sm">

                <p>
                  <strong>
                    Status:
                  </strong>{" "}
                  {approval.status}
                </p>

                <p>
                  <strong>
                    Prepared By:
                  </strong>{" "}
                  {approval.prepared_user
                    ?.full_name ||
                    "-"}
                </p>

                <p>
                  <strong>
                    Reviewed By:
                  </strong>{" "}
                  {approval.reviewed_user
                    ?.full_name ||
                    "-"}
                </p>

                <p>
                  <strong>
                    Approved By:
                  </strong>{" "}
                  {approval.approved_user
                    ?.full_name ||
                    "-"}
                </p>

              </div>
            )}

          </div>

          {/* =====================================================
              SIGNATURES
          ===================================================== */}

          <div className="grid grid-cols-3 gap-10 mt-20 pt-10 border-t">

            {/* PREPARED SIGNATURE */}

            <div className="text-center">

              {approval?.prepared_user
                ?.signature ? (

                <img
                  src={
                    approval
                      .prepared_user
                      .signature
                  }
                  alt="Prepared Signature"
                  className="mx-auto mb-2 h-12 w-auto object-contain"
                />

              ) : (

                <div className="border-b border-black h-12 mb-2" />

              )}

              <p className="font-semibold">
                {approval
                  ?.prepared_user
                  ?.full_name ||
                  "Tested By"}
              </p>

            </div>

            {/* REVIEWED SIGNATURE */}

            <div className="text-center">

              {approval?.reviewed_user
                ?.signature ? (

                <img
                  src={
                    approval
                      .reviewed_user
                      .signature
                  }
                  alt="Reviewed Signature"
                  className="mx-auto mb-2 h-12 w-auto object-contain"
                />

              ) : (

                <div className="border-b border-black h-12 mb-2" />

              )}

              <p className="font-semibold">
                {approval
                  ?.reviewed_user
                  ?.full_name ||
                  "Reviewed By"}
              </p>

            </div>

            {/* APPROVED SIGNATURE */}

            <div className="text-center">

              {approval?.approved_user
                ?.signature ? (

                <img
                  src={
                    approval
                      .approved_user
                      .signature
                  }
                  alt="Approved Signature"
                  className="mx-auto mb-2 h-12 w-auto object-contain"
                />

              ) : (

                <div className="border-b border-black h-12 mb-2" />

              )}

              <p className="font-semibold">
                {approval
                  ?.approved_user
                  ?.full_name ||
                  "Approved By"}
              </p>

            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}

