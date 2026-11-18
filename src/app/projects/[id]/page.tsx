"use client";

import BackButton from "@/components/BackButton";
import { useUiText } from "@/lib/uiText";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";
import ExternalTestRequestForm, { RequestFields, requestFields, reviewFields, approvalFields, toDraft, toPayload, validateReview, printExternalForm, type RequestDraft } from "@/components/ExternalTestRequestForm";
import { permissions } from "@/lib/permissions";

export default function ProjectDetailsPage() {
  const ui = useUiText();
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [externalRequests, setExternalRequests] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingRequest, setSavingRequest] = useState(false);
  const [approvingTechnicalManager, setApprovingTechnicalManager] = useState<number | null>(null);
  const [approvingLabManager, setApprovingLabManager] = useState<
    number | null
  >(null);
  const [deletingTasks, setDeletingTasks] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const [technicians, setTechnicians] = useState<any[]>([]);

  const [technicianId, setTechnicianId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState("عادي");
  const [testType, setTestType] = useState("");

  // =========================
  // Optional link to a specific test on a project sample.
  const [linkTaskId, setLinkTaskId] = useState<number | null>(null);
  const [sampleTestId, setSampleTestId] = useState("");
  const [choices, setChoices] = useState<{ id: string; label: string }[]>([]);
  const [choiceMessage, setChoiceMessage] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    if (!showTaskModal && linkTaskId === null) return;
    let active = true;
    setSampleTestId("");
    setChoices([]);
    setChoiceMessage("جارٍ تحميل فحوصات المشروع...");
    async function loadChoices() {
      const samplesResponse = await supabase.from("samples")
        .select("id,sample_number").eq("project_id", Number(id));
      if (samplesResponse.error) throw samplesResponse.error;
      const projectSamples = samplesResponse.data || [];
      if (!projectSamples.length) return [];
      const rows = await supabase.from("sample_tests").select("id,sample_id,test_id")
        .in("sample_id", projectSamples.map(s => s.id)).order("id");
      if (rows.error) throw rows.error;
      if (!rows.data?.length) return [];
      const names = await supabase.from("tests").select("id,test_name")
        .in("id", Array.from(new Set(rows.data.map(r => r.test_id))));
      if (names.error) throw names.error;
      return rows.data.map(r => ({
        id: String(r.id),
        label: ui("عينة ") + (projectSamples.find(s => s.id === r.sample_id)?.sample_number || r.sample_id)
          + " — " + (names.data?.find(t => t.id === r.test_id)?.test_name || ui("فحص ") + r.test_id)
          + " (#" + r.id + ")",
      }));
    }
    loadChoices().then(items => {
      if (!active) return;
      setChoices(items);
      setChoiceMessage(items.length ? "" : "لا توجد فحوصات عينات متاحة لهذا المشروع.");
    }).catch(() => {
      if (active) setChoiceMessage("تعذّر تحميل فحوصات المشروع. أعيدي فتح النافذة للمحاولة.");
    });
    return () => { active = false; };
  }, [id, showTaskModal, linkTaskId, ui]);

  const sampleTestPicker = (
    <div className="mb-4">
      <label className="block mb-2" htmlFor="task-sample-test">{ui("فحص العينة")}</label>
      <select id="task-sample-test" className="w-full border rounded-lg p-3"
        value={sampleTestId} onChange={e => setSampleTestId(e.target.value)}>
        <option value="">{linkTaskId === null ? ui("ربط الفحص لاحقًا") : ui("اختاري فحص العينة")}</option>
        {choices.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      {choiceMessage && <p className="mt-1 text-sm">{ui(choiceMessage)}</p>}
    </div>
  );

  // CURRENT USER
  // =========================

  const currentUser = getSavedUser() as
    | {
        id: number;
        username: string;
        full_name: string;
        role: string;
        signature?: string | null;
      }
    | null;

  const userRole = currentUser?.role;

  const userPermissions =
    userRole && userRole in permissions
      ? permissions[userRole as keyof typeof permissions]
      : null;

  const isAdmin = userRole === "admin";

  const canCreateContract = userRole === "technical_manager" || userPermissions?.createContract === true;

  const canAssignTask =
    userPermissions?.assignTask === true;

  const isLabManager = Number(currentUser?.id) === 1 && currentUser?.role === "admin";

  // =========================
  // EXTERNAL TEST REQUEST
  // =========================

  const [orderNo, setOrderNo] = useState("");

  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [requestContactPerson, setRequestContactPerson] =
    useState("");

  const [requestTelephone, setRequestTelephone] =
    useState("");

  const [sampleKind, setSampleKind] = useState("");
  const [sampleQuantity, setSampleQuantity] = useState("");
  const [requestedTest, setRequestedTest] = useState("");
  const [testMethod, setTestMethod] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [requestExtras, setRequestExtras] = useState<RequestDraft>({});
  const [creationReview, setCreationReview] = useState<RequestDraft>({});
  const [reviewRequest, setReviewRequest] = useState<any>(null);
  const [reviewDraft, setReviewDraft] = useState<RequestDraft>({});
  const [decisionRequest, setDecisionRequest] = useState<any>(null);
  const [executionDecision, setExecutionDecision] = useState("");
  const [consentRequest, setConsentRequest] = useState<any>(null);
  const [consentDraft, setConsentDraft] = useState<RequestDraft>({});
  const [consentName, setConsentName] = useState("");
  const [savingConsent, setSavingConsent] = useState(false);

  // =========================
  // LOAD
  // =========================

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  // =========================
  // CONTRACT STATUS
  // =========================

  const approvedCustomerContract = externalRequests.find(
    (request) =>
      request.customer_approval_status === "Approved"
  );

  const hasApprovedCustomerContract =
    !!approvedCustomerContract;

  // =========================
  // SAVE TASK
  // =========================

  async function saveTask() {
    if (savingTask) return;
    if (!canAssignTask) {
      alert(ui("ليس لديك صلاحية إسناد المهام."));
      return;
    }

    if (!hasApprovedCustomerContract) {
      alert(
        ui("لا يمكن إسناد المهمة قبل إنشاء عقد العميل واعتماده من العميل.")
      );
      return;
    }

    if (!technicianId) {
      alert(ui("الرجاء اختيار الفني"));
      return;
    }

    if (!taskName.trim()) {
      alert(ui("الرجاء إدخال اسم المهمة"));
      return;
    }

    if (!testType) {
      alert(ui("الرجاء اختيار نوع الفحص"));
      return;
    }

    setSavingTask(true);
    try {
    const { error } = await supabase.from("tasks").insert([
      {
        project_id: Number(id),
        technician_id: Number(technicianId),
        sample_test_id: sampleTestId ? Number(sampleTestId) : null,
        task_name: taskName,
        task_description: taskDescription,
        priority,
        test_type: testType,
        is_test: false,
      },
    ]);

    if (error) {
      console.error("SAVE TASK ERROR:", error);
      alert(error.message);
      return;
    }

    alert(ui("تم إسناد المهمة بنجاح"));

    setShowTaskModal(false);
    setTechnicianId("");
    setTaskName("");
    setTaskDescription("");
    setPriority("عادي");
    setTestType("");

    await loadTasks();
    } catch {
      alert(ui("تعذر تأكيد حفظ المهمة. حدّثي القائمة قبل إعادة المحاولة."));
    } finally {
      setSavingTask(false);
    }
  }

  async function linkExistingTask() {
    if (savingTask || !canAssignTask || !linkTaskId || !sampleTestId) return;
    setSavingTask(true);
    try {
      const { data, error } = await supabase.from("tasks")
        .update({ sample_test_id: Number(sampleTestId) })
        .eq("id", linkTaskId).eq("project_id", Number(id))
        .is("sample_test_id", null).select("id").maybeSingle();
      if (error) throw error;
      if (!data) {
        alert(ui("تعذّر الربط. تحققي من صلاحيتك وحدّثي قائمة المهام."));
        return;
      }
      setLinkTaskId(null);
      await loadTasks();
    } catch {
      alert(ui("تعذّر تأكيد ربط الفحص. حدّثي قائمة المهام."));
    } finally {
      setSavingTask(false);
    }
  }

  // =========================
  // GENERATE UNIQUE REQUEST NO
  // =========================

  function generateRequestNumber() {
    const year = new Date().getFullYear();

    const timestamp = Date.now()
      .toString()
      .slice(-8);

    const random = Math.floor(
      100 + Math.random() * 900
    );

    return `ETR-${year}-${timestamp}${random}`;
  }

  // =========================
  // GENERATE APPROVAL TOKEN
  // =========================

  function generateApprovalToken() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }

  // =========================
  // SAVE CLIENT CONTRACT
  // =========================

 async function saveExternalRequest() {
  if (savingRequest) return;
  if (!canCreateContract) {
    alert(ui("ليس لديك صلاحية إنشاء عقد العميل."));
    return;
  }

  if (!requestedTest.trim()) {
    alert(ui("الرجاء إدخال الاختبار المطلوب"));
    return;
  }

  if (!sampleKind.trim()) {
    alert(ui("الرجاء إدخال نوع العينة"));
    return;
  }

  if (sampleQuantity && (!Number.isInteger(Number(sampleQuantity)) || Number(sampleQuantity) < 1)) {
    alert(ui("عدد العينات يجب أن يكون عددًا صحيحًا موجبًا."));
    return;
  }
  setSavingRequest(true);

  try {
    // ==========================================
    // جلب أحدث بيانات المشروع
    // ==========================================

    const {
      data: freshProject,
      error: freshProjectError,
    } = await supabase
      .from("projects")
      .select("id, project_name, client_id")
      .eq("id", Number(id))
      .single();

    if (freshProjectError || !freshProject) {
      console.error(
        "FRESH PROJECT ERROR:",
        freshProjectError
      );

      alert(
        ui("تعذر تحميل المشروع من قاعدة البيانات.\n\n") +
          (freshProjectError?.message || ui("المشروع غير موجود"))
      );

      return;
    }

    console.log("FRESH PROJECT:", freshProject);

    // ==========================================
    // التأكد أن المشروع مرتبط بعميل
    // ==========================================

    if (
      freshProject.client_id === null ||
      freshProject.client_id === undefined
    ) {
      alert(
        ui("هذا المشروع غير مرتبط بعميل.\n\n") +
          ui("يرجى ربط المشروع بعميل أولًا.")
      );

      return;
    }

    // ==========================================
    // Client ID يؤخذ تلقائيًا من المشروع
    // ==========================================

    const clientId = Number(freshProject.client_id);

    console.log("CLIENT ID FROM PROJECT:", clientId);

    // ==========================================
    // جلب العميل المرتبط بالمشروع
    // ==========================================

    const {
      data: freshClient,
      error: freshClientError,
    } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (freshClientError || !freshClient) {
      console.error(
        "FRESH CLIENT ERROR:",
        freshClientError
      );

      alert(
        ui("المشروع مرتبط بالعميل رقم ") +
          clientId +
          ui(" لكن تعذر تحميل بيانات العميل.\n\n") +
          (freshClientError?.message || ui("العميل غير موجود"))
      );

      return;
    }

    console.log("FRESH CLIENT:", freshClient);

    // ==========================================
    // إنشاء رقم العقد والتوكن
    // ==========================================

    const requestNo = generateRequestNumber();
    const approvalToken = generateApprovalToken();

    // ==========================================
    // حفظ العقد
    // ==========================================

    const {
      data,
      error,
    } = await supabase
      .from("external_test_requests")
      .insert([
        {
          project_id: Number(freshProject.id),

          // Client ID الحقيقي من المشروع
          client_id: clientId,

          request_no: requestNo,

          approval_token: approvalToken,

          order_no: orderNo || null,

          request_date: requestDate,

          contact_person:
            requestContactPerson ||
            freshClient.contact_person ||
            null,

          telephone:
            requestTelephone ||
            freshClient.phone ||
            null,

          ...toPayload(requestExtras, requestFields),
          project_name: freshProject.project_name || null,
          sample_kind: sampleKind,

          quantity: sampleQuantity
            ? Number(sampleQuantity)
            : null,

          requested_test: requestedTest,

          test_method: testMethod || null,

          payment_method: paymentMethod || null,

          status: "Draft",

          technical_review_status: "Pending",

          technical_review_notes: null,

          customer_name:
            freshClient.client_name ||
            "العميل المرتبط بالمشروع",

          customer_approval_status: "Pending",

          customer_approved_by: null,

          customer_approved_at: null,

          customer_signature: null,

          lab_manager_approval_status: "Pending",

          lab_manager_approved_by: null,

          lab_manager_approved_at: null,

          lab_manager_signature: null,

          lab_manager_approved_by_name: null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(
        "SAVE CLIENT CONTRACT ERROR:",
        error
      );

      alert(
        ui("حدث خطأ أثناء حفظ عقد العميل:\n\n") +
          `Code: ${error.code || "-"}\n` +
          `Message: ${error.message || "-"}\n` +
          `Details: ${error.details || "-"}\n` +
          `Hint: ${error.hint || "-"}`
      );

      return;
    }

    console.log(
      "CLIENT CONTRACT CREATED:",
      data
    );

    alert(
      ui("تم إنشاء طلب الفحص بنجاح") + "\n\n" +
        ui("رقم العقد") + ": " + (data?.request_no || requestNo) + "\n\n" +
        ui("تم إصدار رابط موافقة العميل.")
    );

    if (currentUser?.role === "technical_manager" && data) {
      setReviewRequest(data);
      setReviewDraft({ ...toDraft(data, reviewFields), ...creationReview });
    }
    resetExternalRequestForm();

    setShowRequestModal(false);

    await loadExternalRequests();

  } catch (error: any) {
    console.error(
      "UNEXPECTED CLIENT CONTRACT ERROR:",
      error
    );

    alert(
      ui("حدث خطأ غير متوقع:\n\n") +
        (error?.message || ui("خطأ غير معروف"))
    );

  } finally {
    setSavingRequest(false);
  }
}

  // =========================
  // RESET FORM
  // =========================

  function resetExternalRequestForm() {
    setOrderNo("");

    setRequestDate(
      new Date().toISOString().split("T")[0]
    );

    setRequestContactPerson(
      client?.contact_person || ""
    );

    setRequestTelephone(
      client?.phone || ""
    );

    setSampleKind("");
    setSampleQuantity("");
    setRequestedTest("");
    setTestMethod("");
    setPaymentMethod("");
    setRequestExtras({});
    setCreationReview({});
  }

  
  // TECHNICAL MANAGER REVIEW
  async function approveTechnicalManager(request: any, draft: RequestDraft) {
    if (approvingTechnicalManager !== null) return;
    const validation = validateReview(draft, ui);
    if (validation) { alert(validation); return; }
    if (currentUser?.role !== "technical_manager") {
      alert(ui("هذه الصلاحية مخصصة للمدير الفني."));
      return;
    }

    if (!currentUser?.id || request.technical_review_status === "Approved") {
      alert(ui("تعذر إتمام المراجعة أو أن الطلب معتمد فنيًا مسبقًا."));
      return;
    }

    if (!window.confirm(ui("هل تؤكد المراجعة الفنية للطلب") + " " + request.request_no + ui("؟"))) {
      return;
    }

    setApprovingTechnicalManager(request.id);

    try {
      // جلب بيانات المدير الفني الحالية من قاعدة البيانات
      const { data: reviewer, error: reviewerError } = await supabase
        .from("users")
        .select("id, full_name, username, signature")
        .eq("id", Number(currentUser.id))
        .single();

      if (reviewerError) throw reviewerError;

      if (!reviewer) {
        throw new Error(ui("تعذر العثور على بيانات المدير الفني."));
      }

      const reviewerName =
        reviewer.full_name || reviewer.username || "المدير الفني";

      if (!reviewer.signature) {
        alert(ui("لا يوجد توقيع محفوظ لهذا المستخدم. أضيفي توقيعه من صفحة الموظفين أولًا."));
        return;
      }

      // التحقق من حالة الطلب الحالية
      const { data: latest, error: readError } = await supabase
        .from("external_test_requests")
        .select("technical_review_status, lab_manager_approval_status")
        .eq("id", request.id)
        .single();

      if (readError) throw readError;

      if (latest.lab_manager_approval_status === "Approved") {
        throw new Error(ui("الطلب معتمد من مدير المختبر ولا يمكن تغيير مراجعته الفنية."));
      }
      if (latest.technical_review_status === "Approved") {
        alert(ui("تم اعتماد الطلب فنيًا مسبقًا."));
        await loadExternalRequests();
        return;
      }

      // حفظ الاعتماد الفني والاسم والتوقيع
      const { data: updatedRequest, error: updateError } = await supabase
        .from("external_test_requests")
        .update({
          ...toPayload(draft, reviewFields),
          technical_review_status: draft.technical_review_decision === "رفض" ? "Rejected" : "Approved",
          reviewed_by: Number(reviewer.id),
          reviewed_at: new Date().toISOString(),
          technical_reviewed_by_name: reviewerName,
          technical_manager_signature: reviewer.signature,
          status: draft.technical_review_decision === "رفض" ? "Rejected" : "Pending",
        })
        .eq("id", request.id)
        .neq("technical_review_status", "Approved")
        .neq("lab_manager_approval_status", "Approved")
        .select("id");

      if (updateError) throw updateError;

      if (!updatedRequest || updatedRequest.length === 0) {
        throw new Error(ui("لم يُحفظ الاعتماد؛ ربما اعتمد مستخدم آخر الطلب."));
      }

      setReviewRequest(null);
      alert(ui("تم حفظ نتيجة المراجعة الفنية والاسم والتوقيع."));
      await loadExternalRequests();
    } catch (error: any) {
      console.error("TECHNICAL REVIEW ERROR:", error);
      alert(
        ui("تعذرت المراجعة الفنية: ") +
          (error?.message || ui("خطأ غير معروف"))
      );
    } finally {
      setApprovingTechnicalManager(null);
    }
  }


  // APPROVE LAB MANAGER
  async function approveLabManager(request: any) {
    if (approvingLabManager !== null) return;
    if (!isLabManager || !currentUser?.id) { alert(ui("هذه الصلاحية مخصصة لمدير المختبر.")); return; }
    if (!["مقبول للتنفيذ", "مرفوض", "معلق حتى استكمال بيانات"].includes(executionDecision)) {
      alert(ui("يرجى اختيار قرار التنفيذ.")); return;
    }
    if (request.lab_manager_approval_status === "Approved") {
      alert(ui("الطلب معتمد مسبقًا.")); return;
    }
    if (executionDecision === "مقبول للتنفيذ" && request.technical_review_status !== "Approved") {
      alert(ui("يلزم قبول المراجعة الفنية قبل قبول الطلب للتنفيذ.")); return;
    }
    if (executionDecision === "مقبول للتنفيذ" && request.customer_approval_status !== "Approved") {
      alert(ui("يلزم تسجيل موافقة العميل قبل قبول الطلب للتنفيذ.")); return;
    }
    if (!window.confirm(ui("هل تؤكد تسجيل القرار: ") + ui(executionDecision) + ui("؟"))) return;
    setApprovingLabManager(request.id);
    try {
      const { data: manager, error: profileError } = await supabase.from("users")
        .select("id,full_name,username,signature").eq("id", Number(currentUser.id)).single();
      if (profileError) throw profileError;
      if (!manager?.signature) throw new Error(ui("يلزم توقيع محفوظ لمدير المختبر."));
      const accepted = executionDecision === "مقبول للتنفيذ";
      const rejected = executionDecision === "مرفوض";
      let query = supabase.from("external_test_requests").update({
        execution_decision: executionDecision,
        lab_manager_approval_status: accepted ? "Approved" : rejected ? "Rejected" : "Pending",
        lab_manager_approved_by: Number(manager.id),
        lab_manager_approved_at: new Date().toISOString(),
        lab_manager_signature: manager.signature,
        lab_manager_approved_by_name: manager.full_name || manager.username,
        status: accepted ? "Approved" : rejected ? "Rejected" : "Pending",
      }).eq("id", request.id).neq("lab_manager_approval_status", "Approved");
      if (accepted) query = query.eq("technical_review_status", "Approved").eq("customer_approval_status", "Approved");
      const { data, error } = await query.select("id");
      if (error) throw error;
      if (!data?.length) throw new Error(ui("لم يحفظ القرار. ربما تغيرت حالة الطلب. حدّثي الصفحة."));
      setDecisionRequest(null);
      await loadExternalRequests();
      alert(ui("تم حفظ قرار مدير المختبر."));
    } catch (error: any) {
      alert(ui("تعذر حفظ القرار: ") + (error?.message || ui("خطأ غير معروف")));
    } finally { setApprovingLabManager(null); }
  }

  async function saveDocumentedConsent() {
    if (!canCreateContract || !consentRequest || savingConsent) return;
    if (!["واتساب/بريد موثق", "أمر شراء"].includes(consentDraft.customer_approval_method) ||
        !consentDraft.customer_approval_evidence?.trim() || !consentName.trim()) {
      alert(ui("يلزم اسم ممثل العميل وطريقة الموافقة ومرجع الدليل الموثق.")); return;
    }
    setSavingConsent(true);
    try {
      const { data, error } = await supabase.from("external_test_requests").update({
        ...toPayload(consentDraft, approvalFields),
        customer_approval_status: "Approved", customer_approved_by: consentName.trim(),
        customer_approved_at: new Date().toISOString(),
        status: consentRequest.technical_review_status === "Rejected" || consentRequest.lab_manager_approval_status === "Rejected" ? "Rejected" : "Customer Approved",
      }).eq("id", consentRequest.id).eq("updated_at", consentRequest.updated_at).eq("customer_approval_status", "Pending")
        .neq("lab_manager_approval_status", "Approved").select("id");
      if (error) throw error;
      if (!data?.length) throw new Error(ui("تغيرت حالة الطلب أو تعذر حفظ الموافقة."));
      setConsentRequest(null);
      await loadExternalRequests();
      alert(ui("تم تسجيل موافقة العميل ومرجعها. احتفظي بالدليل الأصلي في سجلات المختبر."));
    } catch (error: any) { alert(error?.message || ui("تعذر حفظ الموافقة.")); }
    finally { setSavingConsent(false); }
  }
  // =========================
  // LOAD PROJECT
  // =========================

async function loadProject() {
  setLoading(true);

  try {
    // =========================
    // LOAD PROJECT
    // =========================

    const {
      data: projectData,
      error: projectError,
    } = await supabase
      .from("projects")
      .select("*")
      .eq("id", Number(id))
      .maybeSingle();

    if (projectError) {
      console.error("PROJECT LOAD ERROR:", projectError);

      alert(
        ui("حدث خطأ أثناء تحميل المشروع:\n\n") +
          `Code: ${projectError.code || "-"}\n` +
          `Message: ${projectError.message || "-"}\n` +
          `Details: ${projectError.details || "-"}\n` +
          `Hint: ${projectError.hint || "-"}`
      );

      setProject(null);
      return;
    }

    if (!projectData) {
      console.warn("لم يتم العثور على المشروع:", id);

      alert(ui("لم يتم العثور على بيانات المشروع."));

      setProject(null);
      return;
    }

    console.log("PROJECT FOUND:", projectData);

    // =========================
    // LOAD CLIENT BY client_id
    // =========================

    let clientData: any = null;

    if (
      projectData.client_id !== null &&
      projectData.client_id !== undefined
    ) {
      console.log(
        "LOADING CLIENT ID:",
        projectData.client_id
      );

      const {
        data,
        error,
      } = await supabase
        .from("clients")
        .select("*")
        .eq("id", Number(projectData.client_id))
        .maybeSingle();

      if (error) {
        console.error("CLIENT LOAD ERROR:", error);

        alert(
          ui("المشروع مرتبط بالعميل رقم ") +
            projectData.client_id +
            ui(" لكن حدث خطأ أثناء تحميل بيانات العميل:\n\n") +
            error.message
        );
      } else if (data) {
        clientData = data;

        console.log("CLIENT FOUND:", {
          clientId: data.id,
          clientName: data.client_name,
          phone: data.phone,
          contactPerson: data.contact_person,
        });
      } else {
        console.warn(
          "لم يتم العثور على العميل المرتبط بالمشروع.",
          {
            projectId: projectData.id,
            clientId: projectData.client_id,
          }
        );

        alert(
          ui("المشروع مرتبط بالعميل رقم ") +
            projectData.client_id +
            ui(" لكن لم يتم العثور على بياناته في جدول العملاء.")
        );
      }
    } else {
      console.warn(
        "المشروع لا يحتوي على client_id.",
        {
          projectId: projectData.id,
          projectName: projectData.project_name,
        }
      );

      alert(
        ui("هذا المشروع غير مرتبط بعميل.\n\n") +
          ui("Project ID: ") +
          projectData.id
      );
    }

    // =========================
    // LOAD SAMPLES
    // =========================

    const {
      data: samplesData,
      error: samplesError,
    } = await supabase
      .from("samples")
      .select(
        "id, sample_number, sample_type, status, received_date"
      )
      .eq("project_id", Number(id))
      .order("id", {
        ascending: false,
      });

    if (samplesError) {
      console.error(
        "SAMPLES LOAD ERROR:",
        samplesError
      );
    }

    // =========================
    // DEBUG
    // =========================

    console.log("PROJECT CLIENT CHECK:", {
      projectId: projectData.id,
      projectName: projectData.project_name,
      projectClientId: projectData.client_id,
      clientId: clientData?.id ?? null,
      clientName: clientData?.client_name ?? null,
      clientData: clientData,
    });

    // =========================
    // SET DATA
    // =========================

    setProject(projectData);
    setClient(clientData);
    setSamples(samplesData || []);

    // =========================
    // LOAD TASKS
    // =========================

    await loadTasks();

    // =========================
    // LOAD EXTERNAL REQUESTS
    // =========================

    await loadExternalRequests();

    // =========================
    // LOAD TECHNICIANS
    // =========================

    const {
      data: techData,
      error: techError,
    } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "technician")
      .order("full_name");

    if (techError) {
      console.error(
        "TECHNICIANS LOAD ERROR:",
        techError
      );
    } else {
      setTechnicians(techData || []);
    }

  } catch (error: any) {
    console.error(
      "UNEXPECTED LOAD PROJECT ERROR:",
      error
    );

    alert(
      ui("حدث خطأ غير متوقع أثناء تحميل المشروع:\n\n") +
        (error?.message || ui("خطأ غير معروف"))
    );
  } finally {
    setLoading(false);
  }
}
  // =========================
  // LOAD CONTRACTS
  // =========================

  async function loadExternalRequests() {
    const {
      data,
      error,
    } = await supabase
      .from("external_test_requests")
      .select(`
        id,
        project_id,
        client_id,
        request_no,
        order_no,
        request_date,
        customer_name,
        contact_person,
        telephone,
        sample_kind,
        quantity,
        requested_test,
        test_method,
        payment_method,
        status,
        technical_review_status,
        reviewed_by,
        reviewed_at,
        technical_reviewed_by_name,
        technical_manager_signature,
        technical_manager_stamp,
        approval_token,
        customer_approval_status,
        customer_approved_by,
        customer_approved_at,
        customer_signature,
        created_at,
        lab_manager_approval_status,
        lab_manager_approved_by,
        lab_manager_approved_at,
        lab_manager_signature,
        lab_manager_approved_by_name,
        project_name,
        updated_at,
        execution_decision,
        sample_type,sample_quantity_or_weight,sample_receiving_date,sample_code,results_delivery_date,results_delivery_method,saac_scope_status,sample_status,rejection_reason,customer_requirements_clear,method_suitable_and_current,laboratory_sampling_required,conformity_statement_requested,customer_method_unsuitable,technical_review_decision,technical_review_notes,customer_approval_method,customer_approval_evidence
      `)
      .eq("project_id", Number(id))
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(
        "CONTRACTS ERROR:",
        error
      );

      return;
    }

    setExternalRequests(data || []);
  }

  // =========================
  // COPY APPROVAL LINK
  // =========================

  async function copyApprovalLink(
    request: any
  ) {
    if (!request.approval_token) {
      alert(
        ui("لا يوجد رابط موافقة لهذا العقد.")
      );
      return;
    }

    const approvalUrl =
      `${window.location.origin}/customer-approval/${request.approval_token}`;

    try {
      await navigator.clipboard.writeText(
        approvalUrl
      );

      alert(
        ui("تم نسخ رابط موافقة العميل.")
      );
    } catch (error) {
      console.error(
        "COPY APPROVAL LINK ERROR:",
        error
      );

      window.prompt(
        "انسخ رابط موافقة العميل:",
        approvalUrl
      );
    }
  }

  // =========================
  // OPEN APPROVAL LINK
  // =========================

  function openApprovalLink(
    request: any
  ) {
    if (!request.approval_token) {
      alert(
        ui("لا يوجد رابط موافقة لهذا العقد.")
      );
      return;
    }

    const approvalUrl =
      `${window.location.origin}/customer-approval/${request.approval_token}`;

    window.open(
      approvalUrl,
      "_blank"
    );
  }

  // =========================
  // PRINT CONTRACT
  // =========================

  async function handleTechnicalManagerStampUpload(
    request: any,
    event: any
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";

    if (!isLabManager) {
      alert(ui("رفع ختم الشركة مخصص لمسؤول النظام فقط."));
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert(ui("يرجى اختيار صورة PNG أو JPG أو WEBP."));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(ui("يجب ألا يتجاوز حجم صورة الختم 5 ميجابايت."));
      return;
    }

    try {
      const stampDataUrl: string = await new Promise(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            const result = String(reader.result || "");

            if (!result) {
              reject(new Error(ui("تعذرت قراءة صورة الختم.")));
              return;
            }

            resolve(result);
          };

          reader.onerror = () =>
            reject(new Error(ui("حدث خطأ أثناء قراءة صورة الختم.")));

          reader.readAsDataURL(file);
        }
      );

      const { error } = await supabase
        .from("external_test_requests")
        .update({
          technical_manager_stamp: stampDataUrl,
        })
        .eq("id", request.id);

      if (error) throw error;

      alert(ui("تم حفظ ختم الشركة بنجاح."));
      await loadExternalRequests();
    } catch (error: any) {
      console.error("TECHNICAL MANAGER STAMP ERROR:", error);
      alert(
        ui("تعذر حفظ الختم: ") +
          (error?.message || ui("خطأ غير معروف"))
      );
    }
  }

  function printExternalRequest(request: any) {
    printExternalForm(request.id, ui);
  }

  // =========================
  // LOAD TASKS
  // =========================

  async function loadTasks() {
    const {
      data,
      error,
    } = await supabase
      .from("tasks")
      .select(`
        id,
        project_id,
        technician_id,
        task_name,
        task_description,
        priority,
        status,
        test_type,
        sample_test_id,
        is_test,
        users:technician_id (
          id,
          full_name,
          username
        )
      `)
      .eq("project_id", Number(id))
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(
        "TASKS ERROR:",
        error
      );

      return;
    }

    setTasks(data || []);
  }

  // =========================
  // DELETE TEST TASKS
  // =========================

  async function deleteTestTasks() {
    if (!isAdmin) {
      alert(
        ui("ليس لديك صلاحية حذف المهام التجريبية.")
      );
      return;
    }

    const testTasks = tasks.filter(
      (task) => task.is_test === true
    );

    if (testTasks.length === 0) {
      alert(
        ui("لا توجد مهام تجريبية لحذفها.")
      );
      return;
    }

    const confirmed = window.confirm(
      ui("سيتم حذف المهام التجريبية نهائيًا. العدد") + " " + testTasks.length + ui("؟")
    );

    if (!confirmed) {
      return;
    }

    setDeletingTasks(true);

    try {
      const {
        error,
      } = await supabase
        .from("tasks")
        .delete()
        .eq("project_id", Number(id))
        .eq("is_test", true);

      if (error) {
        alert(
          ui("حدث خطأ أثناء حذف المهام:\n") +
            error.message
        );
        return;
      }

      alert(
        ui("تم حذف جميع المهام التجريبية بنجاح.")
      );

      await loadTasks();
    } finally {
      setDeletingTasks(false);
    }
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          {ui("Loading project...")}
        </div>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          {ui("Project not found")}
        </div>
      </ProtectedRoute>
    );
  }

  // =========================
  // MAIN
  // =========================

  return (
    <ProtectedRoute>

      <div className="p-8 min-h-screen bg-gray-100">

        {/* HEADER */}

        <div className="flex items-center gap-3 mb-6">

          <BackButton onClick={() => router.push("/dashboard")} />

          <h1 className="text-3xl font-bold text-blue-900">
            {ui("Project Details")}
          </h1>

        </div>

        {/* PROJECT */}

        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <div className="flex justify-between items-start">

            <div>

              <h2 className="text-2xl font-bold">
                {project.project_name}
              </h2>

              <p className="text-gray-500 mt-2">
                {project.description ||
                  ui("No description provided")}
              </p>

              {project.client_name && (
  <div className="mt-4 text-sm">
    <span className="text-gray-500">
      {ui("العميل:")}
    </span>{" "}

    <span className="font-semibold">
      {client?.client_name || project.client_name}
    </span>
  </div>
)}

            </div>

            <span className="px-3 py-1 rounded-full text-sm text-white bg-green-600">
              {ui(project.project_status)}
            </span>

          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">

            <div className="border rounded-lg p-4">

              <p className="text-sm text-gray-500">
                {ui("Project Number")}
              </p>

              <p className="font-semibold">
                {project.project_number || "-"}
              </p>

            </div>

            <div className="border rounded-lg p-4">

              <p className="text-sm text-gray-500">
                {ui("Location")}
              </p>

              <p className="font-semibold">
                {project.location || "-"}
              </p>

            </div>

            <div className="border rounded-lg p-4">

              <p className="text-sm text-gray-500">
                {ui("Samples Count")}
              </p>

              <p className="font-semibold">
                {samples.length}
              </p>

            </div>

          </div>

        </div>

        {/* =========================
            CLIENT CONTRACT
        ========================= */}

        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <div className="flex justify-between items-center mb-5">

            <div>

              <h3 className="text-xl font-bold text-blue-900">
                {ui("📝 عقد العميل")}
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {ui("عقد العميل وطلب الفحص والموافقة والتوقيع الإلكتروني")}
              </p>

            </div>

            {canCreateContract && (
              <button
                onClick={() => {
                  resetExternalRequestForm();
                  setShowRequestModal(true);
                }}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
              >
                {ui("+ إنشاء عقد عميل")}
              </button>
            )}

          </div>

          {!client && (
  <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-lg p-4 mb-4">
    {project.client_name
      ? `المشروع مرتبط بالعميل: ${project.client_name}، لكن لم يتم العثور على بيانات العميل في جدول العملاء.`
      : ui("لا يمكن إنشاء عقد لأن المشروع غير مرتبط بعميل.")}
  </div>
)}
          {externalRequests.length === 0 ? (

            <div className="border border-dashed rounded-lg p-8 text-center">

              <p className="text-gray-500 mb-2">
                {ui("لم يتم إنشاء عقد للعميل لهذا المشروع.")}
              </p>

              <p className="text-sm text-gray-400">
                {ui("يجب إنشاء العقد وإرسال رابط الموافقة للعميل قبل إسناد المهام.")}
              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {externalRequests.map((request) => {

                const customerApproved =
                  request.customer_approval_status ===
                  "Approved";

                const labApproved =
                  request.lab_manager_approval_status ===
                  "Approved";

                const approvalDate =
                  request.customer_approved_at
                    ? new Date(
                        request.customer_approved_at
                      ).toLocaleString("ar-SA")
                    : null;

                const labApprovalDate =
                  request.lab_manager_approved_at
                    ? new Date(
                        request.lab_manager_approved_at
                      ).toLocaleString("ar-SA")
                    : null;

                return (

                  <div
                    key={request.id}
                    className={`border-2 rounded-xl p-5 ${
                      customerApproved
                        ? "border-green-300 bg-green-50"
                        : "border-yellow-300 bg-yellow-50"
                    }`}
                  >

                    <div className="flex justify-between items-start gap-4 flex-wrap">

                      <div>

                        <div className="flex items-center gap-2 flex-wrap">

                          <span className="font-bold text-xl">
                            {request.request_no}
                          </span>

                          {customerApproved ? (

                            <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full">
                              {ui("🟢 العميل وافق ووقّع")}
                            </span>

                          ) : (

                            <span className="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full">
                              {ui("🟡 بانتظار العميل")}
                            </span>

                          )}

                          {labApproved ? (

                            <span className="bg-purple-700 text-white text-xs px-3 py-1 rounded-full">
                              {ui("🧪 معتمد من مدير المختبر")}
                            </span>

                          ) : (

                            <span className="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full">
                              {ui("🧪 بانتظار مدير المختبر")}
                            </span>

                          )}

                        </div>

                        <div className="mt-4 grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">

                          <p>
                            {ui("العميل:")}{" "}
                            <strong>
                              {request.customer_name || "-"}
                            </strong>
                          </p>

                          <p>
                            {ui("المشروع:")}{" "}
                            <strong>
                              {project.project_name}
                            </strong>
                          </p>

                          <p>
                            {ui("الاختبار:")}{" "}
                            <strong>
                              {request.requested_test || "-"}
                            </strong>
                          </p>

                          <p>
                            {ui("نوع العينة:")}{" "}
                            <strong>
                              {request.sample_kind || "-"}
                            </strong>
                          </p>

                          <p>
                            {ui("العدد:")}{" "}
                            <strong>
                              {request.quantity ?? "-"}
                            </strong>
                          </p>

                          <p>
                            {ui("طريقة الاختبار:")}{" "}
                            <strong>
                              {request.test_method || "-"}
                            </strong>
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* CUSTOMER APPROVAL */}

                    <div className="mt-5 border-t pt-4">

                      <h4 className="font-bold mb-2">
                        {ui("موافقة العميل")}
                      </h4>

                      {customerApproved ? (

                        <div className="text-sm space-y-1">

                          <p className="text-green-700 font-semibold">
                            {ui("🟢 تم اعتماد العقد وتوقيعه من العميل")}
                          </p>

                          <p>
                            {ui("اسم المعتمد:")}{" "}
                            <strong>
                              {request.customer_approved_by ||
                                "-"}
                            </strong>
                          </p>

                          <p>
                            {ui("تاريخ الاعتماد:")}{" "}
                            <strong>
                              {approvalDate || "-"}
                            </strong>
                          </p>

                          {request.customer_signature && (
                            <div className="mt-3">

                              <p className="text-xs text-gray-500 mb-2">
                                {ui("توقيع العميل:")}
                              </p>

                              <img
                                src={
                                  request.customer_signature
                                }
                                alt={ui("توقيع العميل")}
                                className="max-w-[250px] max-h-[100px] object-contain border rounded-lg bg-white p-2"
                              />

                            </div>
                          )}

                        </div>

                      ) : (

                        <p className="text-yellow-700 font-medium">
                          {ui("🟡 لم يوافق العميل على العقد حتى الآن.")}
                        </p>

                      )}

                    </div>
                    <details className="mt-5 border-t pt-4">
                      <summary className="cursor-pointer font-bold">{ui("عرض نموذج طلب الفحص QF 701/02 كاملًا")}</summary>
                      <ExternalTestRequestForm request={request} projectName={request.project_name || project.project_name} />
                    </details>
                    {canCreateContract && request.customer_approval_status === "Pending" && !labApproved && (
                      <button type="button" className="mt-4 rounded-lg border px-4 py-2" onClick={() => {
                        setConsentRequest(request);
                        setConsentDraft(toDraft(request, approvalFields));
                        setConsentName(request.customer_approved_by || "");
                      }}>{ui("تسجيل موافقة موثقة أو أمر شراء")}</button>
                    )}
                    {/* TECHNICAL MANAGER */}
                    <div className="mt-5 border-t pt-4">
                      <h4 className="font-bold mb-2">
                        {ui("اعتماد المدير الفني")}
                      </h4>

                      {request.technical_review_status === "Approved" ? (
                        <div className="text-sm space-y-2">
                          <p className="text-green-700 font-semibold">
                            {ui("تم اعتماد الطلب فنيًا")}
                          </p>

                          <p>
                            {ui("الاسم:")}{" "}
                            <strong>
                              {request.technical_reviewed_by_name || "-"}
                            </strong>
                          </p>

                          <p>
                            {ui("تاريخ الاعتماد:")}{" "}
                            <strong>
                              {request.reviewed_at
                                ? new Date(request.reviewed_at).toLocaleString(
                                    "ar-SA"
                                  )
                                : "-"}
                            </strong>
                          </p>

                          {request.technical_manager_signature && (
                            <img
                              src={request.technical_manager_signature}
                              alt={ui("توقيع المدير الفني")}
                              className="max-w-[250px] max-h-[100px] object-contain border rounded-lg bg-white p-2"
                            />
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-amber-700 mb-3">
                            {request.technical_review_status === "Rejected" ? ui("المراجعة الفنية مرفوضة") : ui("بانتظار المراجعة الفنية")}
                          </p>

                          {currentUser?.role === "technical_manager" && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewRequest(request);
                                setReviewDraft(toDraft(request, reviewFields));
                              }}
                              disabled={
                                approvingTechnicalManager === request.id
                              }
                              className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                            >
                              {approvingTechnicalManager === request.id
                                ? ui("جارٍ الاعتماد الفني...")
                                : ui("اعتماد المدير الفني")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {/* LAB MANAGER */}

                    <div className="mt-5 border-t pt-4">

                      <h4 className="font-bold mb-2">
                        {ui("اعتماد مدير المختبر")}
                      </h4>

                      {labApproved ? (

                        <div className="text-sm space-y-1">

                          <p className="text-purple-700 font-semibold">
                            {ui("🧪 تم اعتماد العقد من مدير المختبر")}
                          </p>

                          <p>
                            {ui("الاسم:")}{" "}
                            <strong>
                              {request.lab_manager_approved_by_name ||
                                "-"}
                            </strong>
                          </p>

                          <p>
                            {ui("التاريخ:")}{" "}
                            <strong>
                              {labApprovalDate || "-"}
                            </strong>
                          </p>

                        </div>

                      ) : (

                        <div>

                          <p className="text-purple-700 mb-3">
                            {ui(request.execution_decision || "بانتظار قرار مدير المختبر")}
                          </p>

                          {isLabManager && (

                            <button
                              type="button"
                              onClick={() => {
                                setDecisionRequest(request);
                                setExecutionDecision(request.execution_decision || "");
                              }}
                              disabled={
                                approvingLabManager ===
                                request.id
                              }
                              className="bg-purple-700 hover:bg-purple-800 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                            >
                              {approvingLabManager ===
                              request.id
                                ? ui("جاري الاعتماد...")
                                : ui("🧪 اعتماد العقد")}
                            </button>

                          )}

                        </div>

                      )}

                    </div>

                    {/* ACTIONS */}

                    <div className="flex flex-wrap gap-2 mt-5">

                      {!customerApproved &&
                        request.approval_token && (

                          <>
                            <button
                              type="button"
                              onClick={() =>
                                copyApprovalLink(
                                  request
                                )
                              }
                              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm"
                            >
                              {ui("🔗 نسخ رابط موافقة العميل")}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openApprovalLink(
                                  request
                                )
                              }
                              className="border border-blue-700 text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm"
                            >
                              {ui("🌐 فتح رابط الموافقة")}
                            </button>
                          </>

                        )}

                      <button
                        type="button"
                        onClick={() =>
                          printExternalRequest(
                            request
                          )
                        }
                        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        {ui("🖨️ طباعة العقد")}
                      </button>

                      {isLabManager && (
                        <label className="border border-purple-700 text-purple-700 hover:bg-purple-50 px-4 py-2 rounded-lg text-sm cursor-pointer">
                          {ui("رفع ختم الشركة")}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) =>
                              handleTechnicalManagerStampUpload(
                                request,
                                event
                              )
                            }
                          />
                        </label>
                      )}

                      {customerApproved &&
                        request.customer_signature && (

                          <button
                            type="button"
                            onClick={() => {
                              const popup = window.open("", "_blank");
                              if (!popup) { alert(ui("يرجى السماح بالنوافذ المنبثقة.")); return; }
                              popup.opener = null;
                              const title = popup.document.createElement("h2");
                              title.textContent = ui("توقيع العميل");
                              const name = popup.document.createElement("p");
                              name.textContent = request.customer_approved_by || "";
                              const image = popup.document.createElement("img");
                              const source = String(request.customer_signature || "");
                              if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(source) || /^https:\/\//i.test(source)) {
                                image.src = source;
                              }
                              image.alt = "توقيع العميل";
                              image.style.cssText = "max-width:100%;max-height:400px;object-fit:contain";
                              popup.document.documentElement.dir = "rtl";
                              popup.document.body.style.cssText = "font-family:Tahoma,Arial;text-align:center;padding:30px";
                              popup.document.body.append(title, name, image);
                            }}
                            className="border border-green-600 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg text-sm"
                          >
                            {ui("✍️ عرض توقيع العميل")}
                          </button>

                        )}

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </div>

        {/* =========================
            TASK BUTTONS
        ========================= */}

        <div className="flex justify-end gap-3 mb-4">

          {canAssignTask && (

            <button
              onClick={() => {

                if (!hasApprovedCustomerContract) {
                  alert(
                    ui("يجب أولًا إنشاء عقد العميل وإرسال الرابط والحصول على موافقته وتوقيعه.")
                  );
                  return;
                }

                setShowTaskModal(true);
              }}
              className={`text-white px-5 py-2 rounded-lg ${
                hasApprovedCustomerContract
                  ? "bg-blue-700 hover:bg-blue-800"
                  : "bg-gray-400"
              }`}
            >
              {ui("📋 إسناد مهمة")}
            </button>

          )}

          {isAdmin && (

            <button
              onClick={deleteTestTasks}
              disabled={deletingTasks}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              {deletingTasks
                ? ui("جاري الحذف...")
                : ui("🗑️ حذف المهام ")}
            </button>

          )}

        </div>

        {/* =========================
            TASKS
        ========================= */}

        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <div className="flex justify-between items-center mb-4">

            <h3 className="text-xl font-bold">
              {ui("المهام المسندة")}
            </h3>

            <span className="text-sm text-gray-500">
              {ui("عدد المهام:")} {tasks.length}
            </span>

          </div>

          {!hasApprovedCustomerContract && (

            <div className="mb-4 border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-lg p-4">
              {ui("🔒 إسناد المهام مقفول حتى تتم موافقة العميل وتوقيعه على العقد.")}
            </div>

          )}

          {tasks.length === 0 ? (

            <p className="text-gray-500">
              {ui("لا توجد مهام مسندة لهذا المشروع.")}
            </p>

          ) : (

            <div className="space-y-3">

              {tasks.map((task) => {

                const technician =
                  Array.isArray(task.users)
                    ? task.users[0]
                    : task.users;

                return (

                  <div
                    key={task.id}
                    className={`border rounded-lg p-4 ${
                      task.is_test
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200"
                    }`}
                  >

                    <div className="flex justify-between items-start gap-4">

                      <div>

                        <div className="flex items-center gap-2">

                          <p className="font-bold text-lg">
                            {task.task_name}
                          </p>

                          {task.is_test && (

                            <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
                              {ui("تجريبية")}
                            </span>

                          )}

                        </div>

                        {isAdmin &&
                          task.is_test === true && (

                            <button
                              onClick={async () => {

                                const confirmed =
                                  window.confirm(
                                    ui("هل تريد حذف المهمة رقم") + " " + task.id + ui("؟")
                                  );

                                if (!confirmed) {
                                  return;
                                }

                                const {
                                  error,
                                } =
                                  await supabase
                                    .from("tasks")
                                    .delete()
                                    .eq(
                                      "id",
                                      task.id
                                    )
                                    .eq(
                                      "is_test",
                                      true
                                    );

                                if (error) {
                                  alert(
                                    ui("خطأ في حذف المهمة:\n") +
                                      error.message
                                  );
                                  return;
                                }

                                setTasks(
                                  (prev) =>
                                    prev.filter(
                                      (item) =>
                                        item.id !==
                                        task.id
                                    )
                                );

                              }}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-2"
                            >
                              {ui("🗑️ حذف المهمة")}
                            </button>

                          )}

                        <p className="text-sm text-gray-600 mt-1">
                          {task.task_description ||
                            ui("لا يوجد وصف")}
                        </p>

                        <div className="mt-2 text-sm space-y-1">

                          <p>
                            {ui("👨‍🔬 الفني:")}{" "}
                            <span className="font-semibold">
                              {technician?.full_name ||
                                technician?.username ||
                                ui("غير محدد")}
                            </span>
                          </p>

                          <p>
                            {ui("🧪 نوع الفحص:")}{" "}
                            {task.test_type || "-"}
                          </p>

                          <p>
                            {ui("الأولوية:")}{" "}
                            {ui(task.priority || "عادي")}
                          </p>

                          <p>
                            {ui("الحالة:")}{" "}
                            {ui(task.status || "بانتظار البدء")}
                          </p>

                          <p className="text-xs text-gray-400">
                            {ui("رقم المهمة:")} {task.id}
                          </p>
                          {task.sample_test_id ? (
                            <p>{ui("رقم سجل فحص العينة:")} {task.sample_test_id}</p>
                          ) : canAssignTask && (
                            <button type="button" className="text-blue-700 underline"
                              onClick={() => { setSampleTestId(""); setLinkTaskId(task.id); }}>
                              {ui("ربط فحص عينة")}
                            </button>
                          )}

                        </div>

                      </div>

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </div>

        {/* =========================
            SAMPLES
        ========================= */}

        <div className="bg-white rounded-xl shadow p-6">

          <h3 className="text-xl font-bold mb-4">
            {ui("Associated Samples")}
          </h3>

          {samples.length === 0 ? (

            <p className="text-gray-500">
              {ui("No samples linked to this project yet.")}
            </p>

          ) : (

            <div className="space-y-3">

              {samples.map((sample) => (

                <div
                  key={sample.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >

                  <div>

                    <p className="font-semibold">
                      {sample.sample_number ||
                        `Sample #${sample.id}`}
                    </p>

                    <p className="text-sm text-gray-500">
                      {sample.sample_type ||
                        ui("Unknown type")}
                    </p>

                  </div>

                  <div className="text-end">

                    <p className="text-sm font-medium">
                      {ui(sample.status || "Pending")}
                    </p>

                    <p className="text-xs text-gray-400">
                      {sample.received_date ||
                        "-"}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

      {/* =========================
          TASK MODAL
      ========================= */}

      {showTaskModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl p-6 w-full max-w-lg">

            <h2 className="text-2xl font-bold mb-6">
              {ui("📋 إسناد مهمة لفني")}
            </h2>

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                {ui("الفني")}
              </label>

              <select
                value={technicianId}
                onChange={(e) =>
                  setTechnicianId(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="">
                  {ui("اختر الفني")}
                </option>

                {technicians.map((tech) => (

                  <option
                    key={tech.id}
                    value={tech.id}
                  >
                    {tech.full_name}
                  </option>

                ))}

              </select>

            </div>

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                {ui("نوع الفحص")}
              </label>

              <select
                value={testType}
                onChange={(e) =>
                  setTestType(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="">
                  {ui("اختر نوع الفحص")}
                </option>

                <option value="concrete-strength">
                  {ui("فحص قوة عينات الخرسانة الأسمنتية")}
                </option>

                <option value="electrical-density">ASTM D7830 · Electrical Density Gauge / الكثافة بالجهاز الكهربائي</option>
                <option value="field-density">
                  {ui("اختبار الكثافة الحقلية بطريقة المخروط الرملي")}
                </option>

              </select>

            </div>

            {sampleTestPicker}

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                {ui("اسم المهمة")}
              </label>

              <input
                type="text"
                value={taskName}
                onChange={(e) =>
                  setTaskName(e.target.value)
                }
                className="w-full border rounded-lg p-3"
                placeholder={ui("مثال: أخذ عينات تربة")}
              />

            </div>

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                {ui("وصف المهمة")}
              </label>

              <textarea
                value={taskDescription}
                onChange={(e) =>
                  setTaskDescription(
                    e.target.value
                  )
                }
                className="w-full border rounded-lg p-3"
                rows={4}
                placeholder={ui("اكتب تفاصيل المهمة...")}
              />

            </div>

            <div className="mb-6">

              <label className="block mb-2 font-medium">
                {ui("الأولوية")}
              </label>

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="منخفضة">
                  {ui("منخفضة")}
                </option>

                <option value="عادي">
                  {ui("عادي")}
                </option>

                <option value="عالية">
                  {ui("عالية")}
                </option>

              </select>

            </div>

            <div className="flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowTaskModal(false)
                }
                className="border border-gray-300 px-5 py-2 rounded-lg"
              >
                {ui("إلغاء")}
              </button>

              <button
                disabled={savingTask}
                onClick={saveTask}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
              >
                {ui("حفظ المهمة")}
              </button>

            </div>

          </div>

        </div>

      )}

      {linkTaskId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-xl mb-4">{ui("ربط فحص بالمهمة رقم")} {linkTaskId}</h2>
            {sampleTestPicker}
            <div className="flex gap-3">
              <button type="button" disabled={savingTask || !sampleTestId}
                onClick={linkExistingTask} className="bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">{ui("حفظ الربط")}</button>
              <button type="button" disabled={savingTask} onClick={() => setLinkTaskId(null)}>{ui("إلغاء")}</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          CLIENT CONTRACT MODAL
      ========================= */}

      {showRequestModal && (

        <div role="dialog" aria-modal="true" aria-labelledby="qf-create-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6">
            <header className="mb-5 flex items-start justify-between border-b pb-3">
              <div><h2 id="qf-create-title" className="text-xl font-bold">{ui("إنشاء طلب فحص خارجي")}</h2>
                <p dir="ltr">{ui("External Test Request · QF 701/02")}</p>
                <small>{ui("الإصدار/المراجعة 2/4 · تاريخ المراجعة 12/08/2026")}</small></div>
              <button aria-label={ui("إغلاق")} disabled={savingRequest} onClick={() => setShowRequestModal(false)}>✕</button>
            </header>
<fieldset disabled={savingRequest} className="mb-5 rounded-lg border p-4"><legend className="px-2 font-bold">{ui("العميل والمشروع")}</legend><div className="grid gap-3 sm:grid-cols-2"><label>{ui("اسم العميل")}<input className="mt-1 block w-full rounded border p-2" type="text" value={client?.client_name || ""} readOnly /></label>
<label>{ui("اسم المشروع أو رقم القطعة")}<input className="mt-1 block w-full rounded border p-2" type="text" value={project.project_name || ""} readOnly /></label>
<label>{ui("مسؤول الاتصال")}<input className="mt-1 block w-full rounded border p-2" type="text" value={requestContactPerson} onChange={e => setRequestContactPerson(e.target.value)} /></label>
<label>{ui("الهاتف")}<input className="mt-1 block w-full rounded border p-2" type="tel" value={requestTelephone} onChange={e => setRequestTelephone(e.target.value)} /></label>
<label>{ui("رقم طلب العميل")}<input className="mt-1 block w-full rounded border p-2" type="text" value={orderNo} onChange={e => setOrderNo(e.target.value)} /></label>
<label>{ui("تاريخ الطلب")}<input className="mt-1 block w-full rounded border p-2" type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} /></label>
</div></fieldset>
<fieldset disabled={savingRequest} className="mb-5 rounded-lg border p-4"><legend className="px-2 font-bold">{ui("العينات والفحص المطلوب")}</legend><div className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><RequestFields fields={requestFields.filter(field => ["sample_receiving_date"].includes(field.key))} value={requestExtras} onChange={setRequestExtras} /></div><label>{ui("فئة العينات / Sample kind *")}<input className="mt-1 block w-full rounded border p-2" type="text" value={sampleKind} onChange={e => setSampleKind(e.target.value)} /></label>
<label>{ui("عدد العينات")}<input className="mt-1 block w-full rounded border p-2" type="number" value={sampleQuantity} onChange={e => setSampleQuantity(e.target.value)} /></label>
<label>{ui("الاختبار المطلوب *")}<input className="mt-1 block w-full rounded border p-2" type="text" value={requestedTest} onChange={e => setRequestedTest(e.target.value)} /></label>
<label>{ui("مواصفة الاختبار")}<input className="mt-1 block w-full rounded border p-2" type="text" value={testMethod} onChange={e => setTestMethod(e.target.value)} /></label>
<div className="sm:col-span-2"><RequestFields fields={requestFields.filter(field => ["sample_type", "sample_quantity_or_weight"].includes(field.key))} value={requestExtras} onChange={setRequestExtras} /></div></div></fieldset>
<fieldset disabled={savingRequest} className="mb-5 rounded-lg border p-4"><legend className="px-2 font-bold">{ui("المراجعة الفنية عند الاستلام")}</legend><div className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><p className="mb-3 text-sm">{ui("يستكمل المدير الفني هذه البيانات ويوقّع المراجعة بعد حفظ الطلب.")}</p>
<RequestFields fields={reviewFields} value={creationReview} onChange={setCreationReview} disabled={savingRequest || currentUser?.role !== "technical_manager"} /></div></div></fieldset>
<fieldset disabled={savingRequest} className="mb-5 rounded-lg border p-4"><legend className="px-2 font-bold">{ui("تسليم النتائج والمسائل المالية")}</legend><div className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><RequestFields fields={requestFields.filter(field => ["sample_code", "results_delivery_date", "results_delivery_method"].includes(field.key))} value={requestExtras} onChange={setRequestExtras} /></div><label>{ui("طريقة الدفع")}<select className="mt-1 block w-full rounded border p-2" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="">{ui("اختاري")}</option><option value="Cash">{ui("نقدي")}</option><option value="Check">{ui("شيك")}</option><option value="Bank Transfer">{ui("تحويل بنكي")}</option><option value="Account">{ui("على الحساب")}</option></select></label></div></fieldset>
<fieldset disabled={savingRequest} className="mb-5 rounded-lg border p-4"><legend className="px-2 font-bold">{ui("موافقة العميل وقرار مدير المختبر")}</legend><div className="grid gap-3 sm:grid-cols-2"><p>{ui("موافقة العميل أو ممثله المخوّل")}<br/><small>{ui("توقيع من الرابط، أو توثيق موافقة واتساب/بريد أو أمر شراء بعد حفظ الطلب.")}</small></p><p>{ui("قرار مدير المختبر")}<br/><small>{ui("مقبول للتنفيذ / مرفوض / معلق حتى استكمال البيانات.")}</small></p></div></fieldset>
            {/* BUTTONS */}

            <div className="flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowRequestModal(false)
                }
                disabled={savingRequest}
                className="border border-gray-300 px-5 py-2 rounded-lg"
              >
                {ui("إلغاء")}
              </button>

              <button
                onClick={saveExternalRequest}
                disabled={savingRequest}
                className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
              >
                {savingRequest
                  ? ui("جارٍ حفظ طلب الفحص...")
                  : ui("حفظ طلب الفحص وإصدار الرابط")}
              </button>

            </div>

          </div>

        </div>

      )}


      {reviewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
            <h2 id="review-title" className="mb-5 text-xl font-bold">{ui("المراجعة الفنية للطلب")} {reviewRequest.request_no}</h2>
            <RequestFields fields={reviewFields} value={reviewDraft} onChange={setReviewDraft} disabled={approvingTechnicalManager !== null} />
            <div className="mt-5 flex gap-3">
              <button disabled={approvingTechnicalManager !== null} onClick={() => approveTechnicalManager(reviewRequest, reviewDraft)} className="rounded-lg bg-green-700 px-5 py-2 text-white disabled:opacity-50">{approvingTechnicalManager !== null ? ui("جارٍ الحفظ...") : ui("حفظ المراجعة والتوقيع")}</button>
              <button disabled={approvingTechnicalManager !== null} onClick={() => setReviewRequest(null)} className="rounded-lg border px-5 py-2">{ui("إلغاء")}</button>
            </div>
          </div>
        </div>
      )}
      {decisionRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="decision-title">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <h2 id="decision-title" className="mb-5 text-xl font-bold">{ui("قرار مدير المختبر —")} {decisionRequest.request_no}</h2>
            <label className="block">{ui("قرار التنفيذ")}
              <select value={executionDecision} disabled={approvingLabManager !== null} onChange={e => setExecutionDecision(e.target.value)} className="mt-2 w-full rounded-lg border p-3">
                <option value="">{ui("اختاري القرار")}</option>
                <option value="مقبول للتنفيذ">{ui("مقبول للتنفيذ")}</option><option value="مرفوض">{ui("مرفوض")}</option><option value="معلق حتى استكمال بيانات">{ui("معلق حتى استكمال بيانات")}</option>
              </select>
            </label>
            <div className="mt-5 flex gap-3">
              <button disabled={approvingLabManager !== null} onClick={() => approveLabManager(decisionRequest)} className="rounded-lg bg-purple-700 px-5 py-2 text-white disabled:opacity-50">{approvingLabManager !== null ? ui("جارٍ الحفظ...") : ui("تسجيل القرار والتوقيع")}</button>
              <button disabled={approvingLabManager !== null} onClick={() => setDecisionRequest(null)} className="rounded-lg border px-5 py-2">{ui("إلغاء")}</button>
            </div>
          </div>
        </div>
      )}
      {consentRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <h2 id="consent-title" className="mb-5 text-xl font-bold">{ui("توثيق موافقة العميل —")} {consentRequest.request_no}</h2>
            <label className="mb-4 block">{ui("اسم العميل أو ممثله المخول")}
              <input value={consentName} disabled={savingConsent} onChange={e => setConsentName(e.target.value)} className="mt-1 w-full rounded-lg border p-3" />
            </label>
            <RequestFields fields={approvalFields.map(field => field.key === "customer_approval_method" ? { ...field, options: ["واتساب/بريد موثق", "أمر شراء"] } : field)} value={consentDraft} onChange={setConsentDraft} disabled={savingConsent} />
            <p className="mt-3 text-sm">{ui("سجلي مرجع رسالة الموافقة وتاريخها أو رقم أمر الشراء، واحتفظي بالدليل الأصلي.")}</p>
            <div className="mt-5 flex gap-3">
              <button disabled={savingConsent} onClick={saveDocumentedConsent} className="rounded-lg bg-blue-700 px-5 py-2 text-white disabled:opacity-50">{savingConsent ? ui("جارٍ الحفظ...") : ui("تسجيل موافقة العميل")}</button>
              <button disabled={savingConsent} onClick={() => setConsentRequest(null)} className="rounded-lg border px-5 py-2">{ui("إلغاء")}</button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
