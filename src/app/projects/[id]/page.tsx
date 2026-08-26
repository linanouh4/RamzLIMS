"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";
import { permissions } from "@/lib/permissions";

export default function ProjectDetailsPage() {
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

  const canCreateContract =
    userPermissions?.createContract === true;

  const canAssignTask =
    userPermissions?.assignTask === true;

  const isLabManager =
    currentUser?.role === "lab_manager" ||
    currentUser?.role === "admin";

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
    if (!canAssignTask) {
      alert("ليس لديك صلاحية إسناد المهام.");
      return;
    }

    if (!hasApprovedCustomerContract) {
      alert(
        "لا يمكن إسناد المهمة قبل إنشاء عقد العميل واعتماده من العميل."
      );
      return;
    }

    if (!technicianId) {
      alert("الرجاء اختيار الفني");
      return;
    }

    if (!taskName.trim()) {
      alert("الرجاء إدخال اسم المهمة");
      return;
    }

    if (!testType) {
      alert("الرجاء اختيار نوع الفحص");
      return;
    }

    const { error } = await supabase.from("tasks").insert([
      {
        project_id: Number(id),
        technician_id: Number(technicianId),
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

    alert("تم إسناد المهمة بنجاح");

    setShowTaskModal(false);
    setTechnicianId("");
    setTaskName("");
    setTaskDescription("");
    setPriority("عادي");
    setTestType("");

    await loadTasks();
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
  if (!canCreateContract) {
    alert("ليس لديك صلاحية إنشاء عقد العميل.");
    return;
  }

  if (!requestedTest.trim()) {
    alert("الرجاء إدخال الاختبار المطلوب");
    return;
  }

  if (!sampleKind.trim()) {
    alert("الرجاء إدخال نوع العينة");
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
        "تعذر تحميل المشروع من قاعدة البيانات.\n\n" +
          (freshProjectError?.message || "المشروع غير موجود")
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
        "هذا المشروع غير مرتبط بعميل.\n\n" +
          "يرجى ربط المشروع بعميل أولًا."
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
        "المشروع مرتبط بالعميل رقم " +
          clientId +
          " لكن تعذر تحميل بيانات العميل.\n\n" +
          (freshClientError?.message || "العميل غير موجود")
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
        "حدث خطأ أثناء حفظ عقد العميل:\n\n" +
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
      `تم إنشاء عقد العميل بنجاح\n\n` +
        `رقم العقد: ${data?.request_no || requestNo}\n\n` +
        `تم إصدار رابط موافقة العميل.`
    );

    resetExternalRequestForm();

    setShowRequestModal(false);

    await loadExternalRequests();

  } catch (error: any) {
    console.error(
      "UNEXPECTED CLIENT CONTRACT ERROR:",
      error
    );

    alert(
      "حدث خطأ غير متوقع:\n\n" +
        (error?.message || "خطأ غير معروف")
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
  }

  // =========================
  // APPROVE LAB MANAGER
  // =========================

  async function approveLabManager(request: any) {
    if (!isLabManager) {
      alert(
        "ليس لديك صلاحية اعتماد العقد كمدير مختبر."
      );
      return;
    }

    if (!currentUser?.id) {
      alert("تعذر تحديد المستخدم الحالي.");
      return;
    }

    if (
      request.lab_manager_approval_status ===
      "Approved"
    ) {
      alert(
        "العقد معتمد مسبقًا من مدير المختبر."
      );
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من اعتماد العقد ${request.request_no} كمدير مختبر؟`
    );

    if (!confirmed) {
      return;
    }

    setApprovingLabManager(request.id);

    try {
      const managerSignature =
        currentUser.signature || null;

      const managerName =
        currentUser.full_name ||
        currentUser.username ||
        "مدير المختبر";

      const { error } = await supabase
        .from("external_test_requests")
        .update({
          lab_manager_approval_status: "Approved",

          lab_manager_approved_by:
            Number(currentUser.id),

          lab_manager_approved_at:
            new Date().toISOString(),

          lab_manager_signature:
            managerSignature,

          lab_manager_approved_by_name:
            managerName,

          status: "Approved",
        })
        .eq("id", request.id);

      if (error) {
        console.error(
          "LAB MANAGER APPROVAL ERROR:",
          error
        );

        alert(
          "حدث خطأ أثناء اعتماد العقد:\n\n" +
            error.message
        );

        return;
      }

      alert(
        "تم اعتماد العقد بنجاح من مدير المختبر."
      );

      await loadExternalRequests();
    } finally {
      setApprovingLabManager(null);
    }
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
        "حدث خطأ أثناء تحميل المشروع:\n\n" +
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

      alert("لم يتم العثور على بيانات المشروع.");

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
          "المشروع مرتبط بالعميل رقم " +
            projectData.client_id +
            " لكن حدث خطأ أثناء تحميل بيانات العميل:\n\n" +
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
          "المشروع مرتبط بالعميل رقم " +
            projectData.client_id +
            " لكن لم يتم العثور على بياناته في جدول العملاء."
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
        "هذا المشروع غير مرتبط بعميل.\n\n" +
          "Project ID: " +
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
      "حدث خطأ غير متوقع أثناء تحميل المشروع:\n\n" +
        (error?.message || "خطأ غير معروف")
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
        technical_review_notes,
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
        lab_manager_approved_by_name
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
        "لا يوجد رابط موافقة لهذا العقد."
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
        "تم نسخ رابط موافقة العميل."
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
        "لا يوجد رابط موافقة لهذا العقد."
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

  function printExternalRequest(
    request: any
  ) {
    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=900"
    );

    if (!printWindow) {
      alert(
        "يرجى السماح بفتح النوافذ الجديدة للطباعة."
      );
      return;
    }

    const customerApproved =
      request.customer_approval_status ===
      "Approved";

    const labManagerApproved =
      request.lab_manager_approval_status ===
      "Approved";

    const customerApprovalDate =
      request.customer_approved_at
        ? new Date(
            request.customer_approved_at
          ).toLocaleString("ar-SA")
        : "-";

    const labManagerApprovalDate =
      request.lab_manager_approved_at
        ? new Date(
            request.lab_manager_approved_at
          ).toLocaleString("ar-SA")
        : "-";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">

      <head>

        <meta charset="UTF-8" />

        <title>
          عقد العميل - ${
            request.request_no || ""
          }
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Tahoma, sans-serif;
            margin: 0;
            padding: 20px;
            color: #000;
            background: white;
          }

          .page {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
          }

          .header {
            border: 2px solid #000;
            padding: 20px;
            margin-bottom: 15px;
          }

          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
          }

          .company {
            font-size: 24px;
            font-weight: bold;
          }

          .title {
            font-size: 21px;
            font-weight: bold;
            margin-top: 10px;
          }

          .subtitle {
            font-size: 14px;
            color: #444;
            margin-top: 5px;
          }

          .contract-number {
            border: 2px solid #000;
            padding: 15px 25px;
            text-align: center;
            min-width: 180px;
          }

          .contract-number-label {
            font-size: 13px;
          }

          .contract-number-value {
            font-size: 20px;
            font-weight: bold;
            margin-top: 8px;
          }

          .section {
            border: 1px solid #000;
            margin-bottom: 15px;
          }

          .section-title {
            background: #eee;
            border-bottom: 1px solid #000;
            padding: 10px 14px;
            font-size: 17px;
            font-weight: bold;
          }

          .section-body {
            padding: 14px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .field {
            border: 1px solid #999;
            padding: 10px;
            min-height: 65px;
          }

          .label {
            font-size: 12px;
            color: #555;
            margin-bottom: 6px;
          }

          .value {
            font-size: 15px;
            font-weight: bold;
            word-break: break-word;
          }

          .status {
            border: 2px solid #000;
            padding: 12px;
            text-align: center;
            font-weight: bold;
            margin-bottom: 15px;
          }

          .declaration {
            border: 1px solid #000;
            padding: 18px;
            line-height: 2;
            font-size: 15px;
          }

          .signature-box {
            border: 1px solid #999;
            margin-top: 15px;
            padding: 12px;
            min-height: 150px;
          }

          .signature {
            display: block;
            max-width: 400px;
            height: 110px;
            object-fit: contain;
            margin: 10px auto;
          }

          .empty {
            height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #777;
          }

          .footer {
            border-top: 1px solid #000;
            margin-top: 25px;
            padding-top: 10px;
            text-align: center;
            font-size: 12px;
          }

          .print-button {
            margin-top: 20px;
            padding: 12px 25px;
            background: #1d4ed8;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
          }

          @media print {

            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            body {
              padding: 0;
            }

            .print-button {
              display: none;
            }

            .page {
              max-width: none;
            }

          }

        </style>

      </head>

      <body>

        <div class="page">

          <div class="header">

            <div class="header-row">

              <div>

                <div class="company">
                  شركة رمز الإمارات لفحص التربة والخرسانة
                </div>

                <div class="title">
                  عقد العميل وطلب الفحص
                </div>

                <div class="subtitle">
                  External Test Request - QF 701/02
                </div>

              </div>

              <div class="contract-number">

                <div class="contract-number-label">
                  رقم العقد
                </div>

                <div class="contract-number-value">
                  ${
                    request.request_no ||
                    "-"
                  }
                </div>

              </div>

            </div>

          </div>

          <div class="status">

            ${
              customerApproved
                ? "تم اعتماد العقد من العميل"
                : "بانتظار اعتماد العميل"
            }

          </div>

          <div class="section">

            <div class="section-title">
              بيانات العميل والمشروع
            </div>

            <div class="section-body">

              <div class="grid">

                <div class="field">
                  <div class="label">
                    اسم العميل
                  </div>
                  <div class="value">
                    ${
                      request.customer_name ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    اسم المشروع
                  </div>
                  <div class="value">
                    ${
                      project?.project_name ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    مسؤول الاتصال
                  </div>
                  <div class="value">
                    ${
                      request.contact_person ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    الهاتف
                  </div>
                  <div class="value">
                    ${
                      request.telephone ||
                      "-"
                    }
                  </div>
                </div>

              </div>

            </div>

          </div>

          <div class="section">

            <div class="section-title">
              بيانات الطلب
            </div>

            <div class="section-body">

              <div class="grid">

                <div class="field">
                  <div class="label">
                    رقم طلب العميل
                  </div>
                  <div class="value">
                    ${
                      request.order_no ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    تاريخ الطلب
                  </div>
                  <div class="value">
                    ${
                      request.request_date ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    نوع العينة
                  </div>
                  <div class="value">
                    ${
                      request.sample_kind ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    عدد العينات
                  </div>
                  <div class="value">
                    ${
                      request.quantity ??
                      "-"
                    }
                  </div>
                </div>

              </div>

            </div>

          </div>

          <div class="section">

            <div class="section-title">
              بيانات الاختبار
            </div>

            <div class="section-body">

              <div class="grid">

                <div class="field">
                  <div class="label">
                    الاختبار المطلوب
                  </div>
                  <div class="value">
                    ${
                      request.requested_test ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    طريقة الاختبار
                  </div>
                  <div class="value">
                    ${
                      request.test_method ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    طريقة الدفع
                  </div>
                  <div class="value">
                    ${
                      request.payment_method ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    حالة العقد
                  </div>
                  <div class="value">
                    ${
                      request.status ||
                      "-"
                    }
                  </div>
                </div>

              </div>

            </div>

          </div>

          <div class="section">

            <div class="section-title">
              إقرار وموافقة العميل
            </div>

            <div class="section-body">

              <div class="declaration">

                أقر أنا الموقع أدناه بأنني اطلعت
                على بيانات عقد العميل وطلب الفحص
                الموضحة أعلاه، وأنها تمثل متطلبات
                الفحص المطلوبة، وأوافق على تنفيذ
                الاختبارات المذكورة وفقًا للبيانات
                الموضحة في الطلب.

              </div>

            </div>

          </div>

          <div class="section">

            <div class="section-title">
              اعتماد العميل
            </div>

            <div class="section-body">

              <div class="grid">

                <div class="field">
                  <div class="label">
                    الحالة
                  </div>
                  <div class="value">
                    ${
                      customerApproved
                        ? "تم الاعتماد"
                        : "بانتظار الاعتماد"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    اسم المعتمد
                  </div>
                  <div class="value">
                    ${
                      request.customer_approved_by ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    تاريخ الاعتماد
                  </div>
                  <div class="value">
                    ${customerApprovalDate}
                  </div>
                </div>

              </div>

              <div class="signature-box">

                <div class="label">
                  توقيع العميل / ممثل العميل
                </div>

                ${
                  request.customer_signature
                    ? `
                      <img
                        src="${request.customer_signature}"
                        class="signature"
                        alt="توقيع العميل"
                      />
                    `
                    : `
                      <div class="empty">
                        لم يتم توقيع العقد بعد
                      </div>
                    `
                }

              </div>

            </div>

          </div>

          <div class="section">

            <div class="section-title">
              اعتماد مدير المختبر
            </div>

            <div class="section-body">

              <div class="grid">

                <div class="field">
                  <div class="label">
                    الحالة
                  </div>
                  <div class="value">
                    ${
                      labManagerApproved
                        ? "تم الاعتماد"
                        : "بانتظار اعتماد مدير المختبر"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    اسم مدير المختبر
                  </div>
                  <div class="value">
                    ${
                      request.lab_manager_approved_by_name ||
                      "-"
                    }
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    تاريخ الاعتماد
                  </div>
                  <div class="value">
                    ${labManagerApprovalDate}
                  </div>
                </div>

              </div>

              <div class="signature-box">

                <div class="label">
                  توقيع مدير المختبر
                </div>

                ${
                  request.lab_manager_signature
                    ? `
                      <img
                        src="${request.lab_manager_signature}"
                        class="signature"
                        alt="توقيع مدير المختبر"
                      />
                    `
                    : `
                      <div class="empty">
                        لم يتم اعتماد العقد من مدير المختبر بعد
                      </div>
                    `
                }

              </div>

            </div>

          </div>

          <div class="footer">

            <strong>
              شركة رمز الإمارات لفحص التربة والخرسانة
            </strong>

            <br />

            External Test Request - QF 701/02

            <br />

            رقم العقد:
            ${
              request.request_no ||
              "-"
            }

          </div>

          <button
            class="print-button"
            onclick="window.print()"
          >
            🖨️ طباعة العقد
          </button>

        </div>

      </body>

      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
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
        "ليس لديك صلاحية حذف المهام التجريبية."
      );
      return;
    }

    const testTasks = tasks.filter(
      (task) => task.is_test === true
    );

    if (testTasks.length === 0) {
      alert(
        "لا توجد مهام تجريبية لحذفها."
      );
      return;
    }

    const confirmed = window.confirm(
      `سيتم حذف ${testTasks.length} مهمة تجريبية نهائيًا.\n\nهل أنت متأكد؟`
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
          "حدث خطأ أثناء حذف المهام:\n" +
            error.message
        );
        return;
      }

      alert(
        "تم حذف جميع المهام التجريبية بنجاح."
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
          Loading project...
        </div>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          Project not found
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

          <button
  type="button"
  onClick={() => router.push("/dashboard")}
  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  ← العودة للوحة التحكم
</button>

          <h1 className="text-3xl font-bold text-blue-900">
            Project Details
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
                  "No description provided"}
              </p>

              {project.client_name && (
  <div className="mt-4 text-sm">
    <span className="text-gray-500">
      العميل:
    </span>{" "}

    <span className="font-semibold">
      {client?.client_name || project.client_name}
    </span>
  </div>
)}

            </div>

            <span className="px-3 py-1 rounded-full text-sm text-white bg-green-600">
              {project.project_status}
            </span>

          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">

            <div className="border rounded-lg p-4">

              <p className="text-sm text-gray-500">
                Project Number
              </p>

              <p className="font-semibold">
                {project.project_number || "-"}
              </p>

            </div>

            <div className="border rounded-lg p-4">

              <p className="text-sm text-gray-500">
                Location
              </p>

              <p className="font-semibold">
                {project.location || "-"}
              </p>

            </div>

            <div className="border rounded-lg p-4">

              <p className="text-sm text-gray-500">
                Samples Count
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
                📝 عقد العميل
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                عقد العميل وطلب الفحص والموافقة والتوقيع الإلكتروني
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
                + إنشاء عقد عميل
              </button>
            )}

          </div>

          {!client && (
  <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-lg p-4 mb-4">
    {project.client_name
      ? `المشروع مرتبط بالعميل: ${project.client_name}، لكن لم يتم العثور على بيانات العميل في جدول العملاء.`
      : "لا يمكن إنشاء عقد لأن المشروع غير مرتبط بعميل."}
  </div>
)}
          {externalRequests.length === 0 ? (

            <div className="border border-dashed rounded-lg p-8 text-center">

              <p className="text-gray-500 mb-2">
                لم يتم إنشاء عقد للعميل لهذا المشروع.
              </p>

              <p className="text-sm text-gray-400">
                يجب إنشاء العقد وإرسال رابط الموافقة للعميل قبل إسناد المهام.
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
                              🟢 العميل وافق ووقّع
                            </span>

                          ) : (

                            <span className="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full">
                              🟡 بانتظار العميل
                            </span>

                          )}

                          {labApproved ? (

                            <span className="bg-purple-700 text-white text-xs px-3 py-1 rounded-full">
                              🧪 معتمد من مدير المختبر
                            </span>

                          ) : (

                            <span className="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full">
                              🧪 بانتظار مدير المختبر
                            </span>

                          )}

                        </div>

                        <div className="mt-4 grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">

                          <p>
                            العميل:{" "}
                            <strong>
                              {request.customer_name || "-"}
                            </strong>
                          </p>

                          <p>
                            المشروع:{" "}
                            <strong>
                              {project.project_name}
                            </strong>
                          </p>

                          <p>
                            الاختبار:{" "}
                            <strong>
                              {request.requested_test || "-"}
                            </strong>
                          </p>

                          <p>
                            نوع العينة:{" "}
                            <strong>
                              {request.sample_kind || "-"}
                            </strong>
                          </p>

                          <p>
                            العدد:{" "}
                            <strong>
                              {request.quantity ?? "-"}
                            </strong>
                          </p>

                          <p>
                            طريقة الاختبار:{" "}
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
                        موافقة العميل
                      </h4>

                      {customerApproved ? (

                        <div className="text-sm space-y-1">

                          <p className="text-green-700 font-semibold">
                            🟢 تم اعتماد العقد وتوقيعه من العميل
                          </p>

                          <p>
                            اسم المعتمد:{" "}
                            <strong>
                              {request.customer_approved_by ||
                                "-"}
                            </strong>
                          </p>

                          <p>
                            تاريخ الاعتماد:{" "}
                            <strong>
                              {approvalDate || "-"}
                            </strong>
                          </p>

                          {request.customer_signature && (
                            <div className="mt-3">

                              <p className="text-xs text-gray-500 mb-2">
                                توقيع العميل:
                              </p>

                              <img
                                src={
                                  request.customer_signature
                                }
                                alt="توقيع العميل"
                                className="max-w-[250px] max-h-[100px] object-contain border rounded-lg bg-white p-2"
                              />

                            </div>
                          )}

                        </div>

                      ) : (

                        <p className="text-yellow-700 font-medium">
                          🟡 لم يوافق العميل على العقد حتى الآن.
                        </p>

                      )}

                    </div>

                    {/* LAB MANAGER */}

                    <div className="mt-5 border-t pt-4">

                      <h4 className="font-bold mb-2">
                        اعتماد مدير المختبر
                      </h4>

                      {labApproved ? (

                        <div className="text-sm space-y-1">

                          <p className="text-purple-700 font-semibold">
                            🧪 تم اعتماد العقد من مدير المختبر
                          </p>

                          <p>
                            الاسم:{" "}
                            <strong>
                              {request.lab_manager_approved_by_name ||
                                "-"}
                            </strong>
                          </p>

                          <p>
                            التاريخ:{" "}
                            <strong>
                              {labApprovalDate || "-"}
                            </strong>
                          </p>

                        </div>

                      ) : (

                        <div>

                          <p className="text-purple-700 mb-3">
                            🟡 بانتظار اعتماد مدير المختبر
                          </p>

                          {isLabManager && (

                            <button
                              type="button"
                              onClick={() =>
                                approveLabManager(
                                  request
                                )
                              }
                              disabled={
                                approvingLabManager ===
                                request.id
                              }
                              className="bg-purple-700 hover:bg-purple-800 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                            >
                              {approvingLabManager ===
                              request.id
                                ? "جاري الاعتماد..."
                                : "🧪 اعتماد العقد"}
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
                              🔗 نسخ رابط موافقة العميل
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
                              🌐 فتح رابط الموافقة
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
                        🖨️ طباعة العقد
                      </button>

                      {customerApproved &&
                        request.customer_signature && (

                          <button
                            type="button"
                            onClick={() => {

                              const newWindow =
                                window.open(
                                  "",
                                  "_blank"
                                );

                              if (!newWindow) {
                                alert(
                                  "يرجى السماح بفتح النوافذ الجديدة."
                                );
                                return;
                              }

                              newWindow.document.write(`
                                <html
                                  dir="rtl"
                                  lang="ar"
                                >

                                <head>
                                  <meta charset="UTF-8" />
                                  <title>
                                    توقيع العميل
                                  </title>
                                </head>

                                <body style="
                                  margin:0;
                                  padding:40px;
                                  font-family:Arial;
                                  text-align:center;
                                  background:#f9fafb;
                                ">

                                  <h2>
                                    توقيع العميل
                                  </h2>

                                  <p>
                                    ${
                                      request.customer_approved_by ||
                                      ""
                                    }
                                  </p>

                                  <img
                                    src="${request.customer_signature}"
                                    style="
                                      max-width:600px;
                                      max-height:400px;
                                      border:1px solid #ddd;
                                      border-radius:10px;
                                      padding:20px;
                                      background:white;
                                    "
                                  />

                                </body>

                                </html>
                              `);

                              newWindow.document.close();

                            }}
                            className="border border-green-600 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg text-sm"
                          >
                            ✍️ عرض توقيع العميل
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
                    "يجب أولًا إنشاء عقد العميل وإرسال الرابط والحصول على موافقته وتوقيعه."
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
              📋 إسناد مهمة
            </button>

          )}

          {isAdmin && (

            <button
              onClick={deleteTestTasks}
              disabled={deletingTasks}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              {deletingTasks
                ? "جاري الحذف..."
                : "🗑️ حذف المهام التجريبية"}
            </button>

          )}

        </div>

        {/* =========================
            TASKS
        ========================= */}

        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <div className="flex justify-between items-center mb-4">

            <h3 className="text-xl font-bold">
              المهام المسندة
            </h3>

            <span className="text-sm text-gray-500">
              عدد المهام: {tasks.length}
            </span>

          </div>

          {!hasApprovedCustomerContract && (

            <div className="mb-4 border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-lg p-4">
              🔒 إسناد المهام مقفول حتى تتم موافقة العميل وتوقيعه على العقد.
            </div>

          )}

          {tasks.length === 0 ? (

            <p className="text-gray-500">
              لا توجد مهام مسندة لهذا المشروع.
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
                              تجريبية
                            </span>

                          )}

                        </div>

                        {isAdmin &&
                          task.is_test === true && (

                            <button
                              onClick={async () => {

                                const confirmed =
                                  window.confirm(
                                    `هل أنت متأكد من حذف المهمة رقم ${task.id}؟`
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
                                    "خطأ في حذف المهمة:\n" +
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
                              🗑️ حذف المهمة
                            </button>

                          )}

                        <p className="text-sm text-gray-600 mt-1">
                          {task.task_description ||
                            "لا يوجد وصف"}
                        </p>

                        <div className="mt-2 text-sm space-y-1">

                          <p>
                            👨‍🔬 الفني:{" "}
                            <span className="font-semibold">
                              {technician?.full_name ||
                                technician?.username ||
                                "غير محدد"}
                            </span>
                          </p>

                          <p>
                            🧪 نوع الفحص:{" "}
                            {task.test_type || "-"}
                          </p>

                          <p>
                            الأولوية:{" "}
                            {task.priority || "عادي"}
                          </p>

                          <p>
                            الحالة:{" "}
                            {task.status ||
                              "بانتظار البدء"}
                          </p>

                          <p className="text-xs text-gray-400">
                            رقم المهمة: {task.id}
                          </p>

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
            Associated Samples
          </h3>

          {samples.length === 0 ? (

            <p className="text-gray-500">
              No samples linked to this project yet.
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
                        "Unknown type"}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-sm font-medium">
                      {sample.status ||
                        "Pending"}
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
              📋 إسناد مهمة لفني
            </h2>

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                الفني
              </label>

              <select
                value={technicianId}
                onChange={(e) =>
                  setTechnicianId(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="">
                  اختر الفني
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
                نوع الفحص
              </label>

              <select
                value={testType}
                onChange={(e) =>
                  setTestType(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="">
                  اختر نوع الفحص
                </option>

                <option value="concrete-strength">
                  فحص قوة عينات الخرسانة الأسمنتية
                </option>

                <option value="field-density">
                  اختبار الكثافة الحقلية بطريقة المخروط الرملي
                </option>

              </select>

            </div>

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                اسم المهمة
              </label>

              <input
                type="text"
                value={taskName}
                onChange={(e) =>
                  setTaskName(e.target.value)
                }
                className="w-full border rounded-lg p-3"
                placeholder="مثال: أخذ عينات تربة"
              />

            </div>

            <div className="mb-4">

              <label className="block mb-2 font-medium">
                وصف المهمة
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
                placeholder="اكتب تفاصيل المهمة..."
              />

            </div>

            <div className="mb-6">

              <label className="block mb-2 font-medium">
                الأولوية
              </label>

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="منخفضة">
                  منخفضة
                </option>

                <option value="عادي">
                  عادي
                </option>

                <option value="عالية">
                  عالية
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
                إلغاء
              </button>

              <button
                onClick={saveTask}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg"
              >
                حفظ المهمة
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =========================
          CLIENT CONTRACT MODAL
      ========================= */}

      {showRequestModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center mb-6">

              <div>

                <h2 className="text-2xl font-bold text-blue-900">
                  📝 إنشاء عقد العميل
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  External Test Request - QF 701/02
                </p>

              </div>

              <button
                onClick={() =>
                  setShowRequestModal(false)
                }
                className="text-gray-500 hover:text-gray-800 text-2xl"
              >
                ×
              </button>

            </div>

            {/* CUSTOMER */}

            <div className="border rounded-xl p-4 mb-5">

              <h3 className="font-bold mb-4">
                بيانات العميل والمشروع
              </h3>

              <div className="grid md:grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    اسم العميل
                  </label>

                  <input
                    value={
                      client?.client_name ||
                      "غير مرتبط"
                    }
                    disabled
                    className="w-full border rounded-lg p-3 bg-gray-100"
                  />

                </div>

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    اسم المشروع
                  </label>

                  <input
                    value={
                      project.project_name ||
                      ""
                    }
                    disabled
                    className="w-full border rounded-lg p-3 bg-gray-100"
                  />

                </div>

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    مسؤول الاتصال
                  </label>

                  <input
                    value={
                      requestContactPerson
                    }
                    onChange={(e) =>
                      setRequestContactPerson(
                        e.target.value
                      )
                    }
                    className="w-full border rounded-lg p-3"
                  />

                </div>

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    الهاتف
                  </label>

                  <input
                    value={
                      requestTelephone
                    }
                    onChange={(e) =>
                      setRequestTelephone(
                        e.target.value
                      )
                    }
                    className="w-full border rounded-lg p-3"
                  />

                </div>

              </div>

            </div>

            {/* REQUEST */}

            <div className="border rounded-xl p-4 mb-5">

              <h3 className="font-bold mb-4">
                بيانات العقد
              </h3>

              <div className="grid md:grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    رقم طلب العميل
                  </label>

                  <input
                    value={orderNo}
                    onChange={(e) =>
                      setOrderNo(
                        e.target.value
                      )
                    }
                    className="w-full border rounded-lg p-3"
                    placeholder="رقم طلب العميل"
                  />

                </div>

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    تاريخ العقد
                  </label>

                  <input
                    type="date"
                    value={requestDate}
                    onChange={(e) =>
                      setRequestDate(
                        e.target.value
                      )
                    }
                    className="w-full border rounded-lg p-3"
                  />

                </div>

              </div>

            </div>

            {/* SAMPLE */}

            <div className="border rounded-xl p-4 mb-5">

              <h3 className="font-bold mb-4">
                بيانات العينة
              </h3>

              <div className="grid md:grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    نوع العينة *
                  </label>

                  <input
                    value={sampleKind}
                    onChange={(e) =>
                      setSampleKind(
                        e.target.value
                      )
                    }
                    className="w-full border rounded-lg p-3"
                    placeholder="مثال: خرسانة / تربة"
                  />

                </div>

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    عدد العينات
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={sampleQuantity}
                    onChange={(e) =>
                      setSampleQuantity(
                        e.target.value
                      )
                    }
                    className="w-full border rounded-lg p-3"
                  />

                </div>

              </div>

            </div>

            {/* TEST */}

            <div className="border rounded-xl p-4 mb-5">

              <h3 className="font-bold mb-4">
                بيانات الاختبار
              </h3>

              <div className="space-y-4">

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    الاختبار المطلوب *
                  </label>

                  <input
                    value={requestedTest}
                    onChange={(e) =>
                      setRequestedTest(
                        e.target.value
                      )
                    }
                    className="w-full border rounded-lg p-3"
                    placeholder="مثال: اختبار مقاومة الضغط"
                  />

                </div>

                <div>

                  <label className="block text-sm text-gray-600 mb-1">
                    مواصفة / طريقة الاختبار
                  </label>

                  <input
                    value={testMethod}
                    onChange={(e) =>
                      setTestMethod(
                        e.target.value
                      )
                    }
                    className="w-full border rounded-lg p-3"
                    placeholder="مثال: ASTM / BS / SASO"
                  />

                </div>

              </div>

            </div>

            {/* PAYMENT */}

            <div className="border rounded-xl p-4 mb-6">

              <h3 className="font-bold mb-4">
                المسائل المالية
              </h3>

              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value
                  )
                }
                className="w-full border rounded-lg p-3"
              >

                <option value="">
                  اختر طريقة الدفع
                </option>

                <option value="Cash">
                  نقدي
                </option>

                <option value="Check">
                  شيك
                </option>

                <option value="Bank Transfer">
                  تحويل بنكي
                </option>

                <option value="Account">
                  على الحساب
                </option>

              </select>

            </div>

            {/* INFO */}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">

              بعد حفظ العقد سيتم إنشاء رابط خاص للعميل،
              ويمكن نسخه وإرساله للعميل ليطلع على العقد
              ويوافق عليه ويوقّعه إلكترونيًا.

            </div>

            {/* BUTTONS */}

            <div className="flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowRequestModal(false)
                }
                disabled={savingRequest}
                className="border border-gray-300 px-5 py-2 rounded-lg"
              >
                إلغاء
              </button>

              <button
                onClick={saveExternalRequest}
                disabled={savingRequest}
                className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
              >
                {savingRequest
                  ? "جاري إنشاء العقد..."
                  : "📝 إنشاء العقد وإصدار الرابط"}
              </button>

            </div>

          </div>

        </div>

      )}

    </ProtectedRoute>
  );
}