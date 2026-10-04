"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getSavedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type CurrentUser = {
  id: number;
  role: string;
  branch_id: number | null;
};

type Client = {
  id: number;
  client_name: string | null;
  branch_id: number | null;
  status: string | null;
};

type Branch = {
  id: number;
  [key: string]: any;
};

type ContractClient = {
  id?: number;
  client_name: string | null;
  phone: string | null;
  city: string | null;
  contact_person: string | null;
  branch_id?: number | null;
};

type Contract = {
  id: number;
  contract_number: string | null;
  contract_name: string | null;
  client_id: number | null;
  branch_id: number | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
  clients: ContractClient | ContractClient[] | null;
};

type ContractForm = {
  contract_number: string;
  contract_name: string;
  client_id: string;
  branch_id: string;
  start_date: string;
  end_date: string;
  contract_value: string;
  status: string;
  description: string;
};

const emptyForm: ContractForm = {
  contract_number: "",
  contract_name: "",
  client_id: "",
  branch_id: "",
  start_date: "",
  end_date: "",
  contract_value: "",
  status: "Active",
  description: "",
};

export default function ContractsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [contracts, setContracts] =
    useState<Contract[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [openModal, setOpenModal] = useState(false);
  const [editingContract, setEditingContract] =
    useState<Contract | null>(null);

  const [form, setForm] =
    useState<ContractForm>(emptyForm);

  const isAdmin =
    currentUser?.role?.toLowerCase() === "admin";

  const isTechnicalManager =
    currentUser?.role?.toLowerCase() ===
    "technical_manager";

  const isBranchManager =
    currentUser?.role?.toLowerCase() ===
    "branch_manager";

  const canManage =
    isAdmin ||
    isTechnicalManager ||
    isBranchManager;

  const canDelete = isAdmin;

  useEffect(() => {
    initializePage();
  }, []);

  async function initializePage() {
    setLoading(true);
    setError("");

    try {
      const savedUser = getSavedUser();

      if (!savedUser) {
        router.push("/");
        return;
      }

      const userId = Number(savedUser.id);

      if (!userId) {
        setError("بيانات المستخدم الحالي غير صحيحة.");
        return;
      }

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("users")
        .select("id, role, branch_id")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        console.error(
          "LOAD CURRENT USER ERROR:",
          userError
        );

        setError(
          userError?.message ||
            "تعذر تحميل بيانات المستخدم الحالي."
        );

        return;
      }

      const current: CurrentUser = {
        id: Number(userData.id),
        role: userData.role,
        branch_id:
          userData.branch_id != null
            ? Number(userData.branch_id)
            : null,
      };

      setCurrentUser(current);

      await Promise.all([
        loadContracts(current),
        loadClients(current),
        loadBranches(),
      ]);
    } catch (err) {
      console.error(
        "CONTRACTS PAGE ERROR:",
        err
      );

      setError(
        "حدث خطأ أثناء تحميل صفحة العقود."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadContracts(
    user: CurrentUser
  ) {
    let query = supabase
      .from("contracts")
      .select(`
        id,
        contract_number,
        contract_name,
        client_id,
        branch_id,
        start_date,
        end_date,
        contract_value,
        status,
        description,
        created_at,
        clients (
          id,
          client_name,
          phone,
          city,
          contact_person,
          branch_id
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (
      user.role?.toLowerCase() ===
      "branch_manager"
    ) {
      if (!user.branch_id) {
        setContracts([]);
        return;
      }

      query = query.eq(
        "branch_id",
        user.branch_id
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "LOAD CONTRACTS ERROR:",
        error
      );

      throw error;
    }

    setContracts(
      (data as Contract[]) || []
    );
  }

  async function loadClients(
    user: CurrentUser
  ) {
    let query = supabase
      .from("clients")
      .select(
        "id, client_name, branch_id, status"
      )
      .order("client_name", {
        ascending: true,
      });

    if (
      user.role?.toLowerCase() ===
      "branch_manager"
    ) {
      if (!user.branch_id) {
        setClients([]);
        return;
      }

      query = query.eq(
        "branch_id",
        user.branch_id
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "LOAD CLIENTS ERROR:",
        error
      );

      throw error;
    }

    setClients(
      (data as Client[]) || []
    );
  }

  async function loadBranches() {
    const {
      data,
      error,
    } = await supabase
      .from("branches")
      .select("*")
      .order("id", {
        ascending: true,
      });

    if (error) {
      console.error(
        "LOAD BRANCHES ERROR:",
        error
      );

      throw error;
    }

    setBranches(
      (data as Branch[]) || []
    );
  }

  function getClient(
    contract: Contract
  ): ContractClient | null {
    if (!contract.clients) {
      return null;
    }

    if (Array.isArray(contract.clients)) {
      return contract.clients[0] || null;
    }

    return contract.clients;
  }

  function getBranchName(
    branchId: number | null
  ) {
    if (!branchId) {
      return "-";
    }

    const branch = branches.find(
      (item) =>
        Number(item.id) ===
        Number(branchId)
    );

    if (!branch) {
      return `فرع ${branchId}`;
    }

    return (
      branch.branch_name ||
      branch.name ||
      branch.title ||
      branch.branch ||
      `فرع ${branchId}`
    );
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleDateString("ar-SA");
  }

  function escapeHtml(
    value: unknown
  ) {
    return String(
      value ?? "-"
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function printContract(
    contract: Contract
  ) {
    const client = getClient(contract);

    const contractNumber =
      contract.contract_number ||
      "بدون رقم";

    const contractName =
      contract.contract_name ||
      "بدون اسم";

    const status =
      contract.status ||
      "غير محدد";

    const branchName =
      getBranchName(
        contract.branch_id
      );

    const contractValue =
      contract.contract_value !== null &&
      contract.contract_value !== undefined
        ? `${Number(
            contract.contract_value
          ).toLocaleString("ar-SA")} ريال`
        : "-";

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

    if (!printWindow) {
      alert(
        "تعذر فتح نافذة الطباعة. تأكدي من السماح بالنوافذ المنبثقة لهذا الموقع."
      );
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(
    `عقد ${contractNumber}`
  )}</title>

  <style>
    @page {
      size: A4;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1f2937;
      font-family:
        Arial,
        "Tahoma",
        sans-serif;
    }

    body {
      direction: rtl;
      font-size: 13px;
      line-height: 1.7;
    }

    .page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }

    .document-header {
      border: 1px solid #9ca3af;
      margin-bottom: 18px;
    }

    .header-row {
      display: grid;
      border-bottom: 1px solid #9ca3af;
    }

    .header-row:last-child {
      border-bottom: 0;
    }

    .header-row.top {
      grid-template-columns: 1fr 2fr 1fr;
    }

    .header-row.bottom {
      grid-template-columns:
        1fr 1fr 1fr 1fr;
    }

    .header-cell {
      padding: 10px 12px;
      border-left: 1px solid #9ca3af;
      min-height: 52px;
    }

    .header-cell:last-child {
      border-left: 0;
    }

    .header-label {
      color: #6b7280;
      font-size: 9px;
      margin-bottom: 3px;
      font-weight: normal;
    }

    .header-value {
      color: #111827;
      font-size: 12px;
      font-weight: bold;
    }

    .header-title {
      text-align: center;
      font-size: 17px;
    }

    .title {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      margin: 8px 0 3px;
    }

    .subtitle {
      color: #6b7280;
      font-size: 12px;
      margin-bottom: 18px;
    }

    .contract-header {
      background: #1e293b;
      color: white;
      padding: 18px;
      border-radius: 8px 8px 0 0;
      border: 1px solid #1e293b;
    }

    .contract-number-label {
      color: #cbd5e1;
      font-size: 10px;
      margin-bottom: 2px;
    }

    .contract-number {
      font-size: 22px;
      font-weight: bold;
    }

    .contract-name {
      color: #cbd5e1;
      font-size: 13px;
      margin-top: 3px;
    }

    .status {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 12px;
      border-radius: 20px;
      background: #16a34a;
      color: white;
      font-size: 11px;
      font-weight: bold;
    }

    .contract-body {
      border: 1px solid #d1d5db;
      border-top: 0;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }

    .section-title {
      font-size: 15px;
      font-weight: bold;
      color: #111827;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 7px;
      margin-bottom: 14px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 25px;
    }

    .info-item {
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }

    .info-label {
      color: #6b7280;
      font-size: 10px;
      margin-bottom: 2px;
    }

    .info-value {
      color: #111827;
      font-size: 12px;
      font-weight: bold;
      min-height: 20px;
    }

    .description {
      margin-top: 22px;
      padding-top: 16px;
      border-top: 1px solid #d1d5db;
    }

    .description-box {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      padding: 12px;
      border-radius: 5px;
      white-space: pre-wrap;
      line-height: 1.8;
    }

    .signature-section {
      margin-top: 45px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 45px;
    }

    .signature-box {
      text-align: center;
      padding-top: 10px;
    }

    .signature-title {
      font-weight: bold;
      margin-bottom: 35px;
    }

    .signature-line {
      border-top: 1px solid #6b7280;
      width: 80%;
      margin: 0 auto;
      padding-top: 5px;
      color: #6b7280;
      font-size: 10px;
    }

    .footer {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid #d1d5db;
      display: flex;
      justify-content: space-between;
      color: #6b7280;
      font-size: 9px;
    }

    .print-button {
      display: block;
      margin: 0 auto 20px;
      padding: 10px 20px;
      border: 0;
      background: #1d4ed8;
      color: white;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }

    @media print {
      .print-button {
        display: none !important;
      }

      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .page {
        max-width: none;
      }
    }
  </style>
</head>

<body>
  <div class="page">

    <button
      class="print-button"
      onclick="window.print()"
    >
      🖨️ طباعة / حفظ كـ PDF
    </button>

    <div class="document-header">

      <div class="header-row top">

        <div class="header-cell">
          <div class="header-label">
            Document code
          </div>
          <div class="header-value">
            QF 701/01
          </div>
        </div>

        <div class="header-cell">
          <div class="header-label">
            Document Type
          </div>
          <div class="header-value header-title">
            Customer Contract
          </div>
        </div>

        <div class="header-cell">
          <div class="header-label">
            Issue / Rev #
          </div>
          <div class="header-value">
            1/3
          </div>
        </div>

      </div>

      <div class="header-row bottom">

        <div class="header-cell">
          <div class="header-label">
            Issue Date
          </div>
          <div class="header-value">
            31/12/2023
          </div>
        </div>

        <div class="header-cell">
          <div class="header-label">
            Copy #
          </div>
          <div class="header-value">
            -
          </div>
        </div>

        <div class="header-cell">
          <div class="header-label">
            Revision Date
          </div>
          <div class="header-value">
            31/12/2024
          </div>
        </div>

        <div class="header-cell">
          <div class="header-label">
            Page
          </div>
          <div class="header-value">
            Page 1 of 2
          </div>
        </div>

      </div>

    </div>

    <div class="title">
      Customer Contract
    </div>

    <div class="subtitle">
      عقد العميل
    </div>

    <div class="contract-header">

      <div class="contract-number-label">
        رقم العقد
      </div>

      <div class="contract-number">
        ${escapeHtml(contractNumber)}
      </div>

      <div class="contract-name">
        ${escapeHtml(contractName)}
      </div>

      <span class="status">
        ${escapeHtml(status)}
      </span>

    </div>

    <div class="contract-body">

      <div class="section-title">
        بيانات العقد
      </div>

      <div class="info-grid">

        <div class="info-item">
          <div class="info-label">
            العميل
          </div>
          <div class="info-value">
            ${escapeHtml(
              client?.client_name
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            جهة الاتصال
          </div>
          <div class="info-value">
            ${escapeHtml(
              client?.contact_person
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            هاتف العميل
          </div>
          <div class="info-value">
            ${escapeHtml(
              client?.phone
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            المدينة
          </div>
          <div class="info-value">
            ${escapeHtml(
              client?.city
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            الفرع
          </div>
          <div class="info-value">
            ${escapeHtml(
              branchName
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            رقم العميل
          </div>
          <div class="info-value">
            ${escapeHtml(
              contract.client_id
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            قيمة العقد
          </div>
          <div class="info-value">
            ${escapeHtml(
              contractValue
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            حالة العقد
          </div>
          <div class="info-value">
            ${escapeHtml(
              status
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            تاريخ بداية العقد
          </div>
          <div class="info-value">
            ${escapeHtml(
              formatDate(
                contract.start_date
              )
            )}
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            تاريخ نهاية العقد
          </div>
          <div class="info-value">
            ${escapeHtml(
              formatDate(
                contract.end_date
              )
            )}
          </div>
        </div>

      </div>

      ${
        contract.description
          ? `
        <div class="description">

          <div class="section-title">
            وصف العقد
          </div>

          <div class="description-box">
            ${escapeHtml(
              contract.description
            )}
          </div>

        </div>
      `
          : ""
      }

      <div class="signature-section">

        <div class="signature-box">
          <div class="signature-title">
            ممثل العميل
          </div>

          <div class="signature-line">
            الاسم والتوقيع
          </div>
        </div>

        <div class="signature-box">
          <div class="signature-title">
            ممثل المختبر
          </div>

          <div class="signature-line">
            الاسم والتوقيع
          </div>
        </div>

      </div>

    </div>

    <div class="footer">
      <span>
        QF 701/01
      </span>

      <span>
        Customer Contract
      </span>

      <span>
        Contract No:
        ${escapeHtml(contractNumber)}
      </span>
    </div>

  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 400);
    };
  </script>

</body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function openAddModal() {
    setEditingContract(null);

    setForm({
      ...emptyForm,
      branch_id:
        isBranchManager &&
        currentUser?.branch_id
          ? String(currentUser.branch_id)
          : "",
    });

    setError("");
    setSuccess("");
    setOpenModal(true);
  }

  function openEditModal(
    contract: Contract
  ) {
    const client = getClient(contract);

    if (
      isBranchManager &&
      Number(contract.branch_id) !==
        Number(currentUser?.branch_id)
    ) {
      alert(
        "لا يمكنك تعديل عقد تابع لفرع آخر."
      );

      return;
    }

    setEditingContract(contract);

    setForm({
      contract_number:
        contract.contract_number || "",

      contract_name:
        contract.contract_name || "",

      client_id:
        contract.client_id != null
          ? String(contract.client_id)
          : "",

      branch_id:
        contract.branch_id != null
          ? String(contract.branch_id)
          : client?.branch_id != null
          ? String(client.branch_id)
          : "",

      start_date:
        contract.start_date || "",

      end_date:
        contract.end_date || "",

      contract_value:
        contract.contract_value != null
          ? String(contract.contract_value)
          : "",

      status:
        contract.status || "Active",

      description:
        contract.description || "",
    });

    setError("");
    setSuccess("");
    setOpenModal(true);
  }

  function closeModal() {
    if (saving) return;

    setOpenModal(false);
    setEditingContract(null);
    setForm(emptyForm);
  }

  function handleClientChange(
    clientId: string
  ) {
    const selectedClient =
      clients.find(
        (client) =>
          String(client.id) ===
          clientId
      );

    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      branch_id:
        selectedClient?.branch_id != null
          ? String(selectedClient.branch_id)
          : prev.branch_id,
    }));
  }

  async function saveContract(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!currentUser) {
      alert(
        "لم يتم التعرف على المستخدم الحالي."
      );
      return;
    }

    if (!canManage) {
      alert(
        "ليس لديك صلاحية لإضافة أو تعديل العقود."
      );
      return;
    }

    if (
      !form.contract_number.trim() ||
      !form.contract_name.trim() ||
      !form.client_id
    ) {
      alert(
        "يرجى تعبئة رقم العقد واسم العقد والعميل."
      );
      return;
    }

    const selectedClient =
      clients.find(
        (client) =>
          Number(client.id) ===
          Number(form.client_id)
      );

    if (!selectedClient) {
      alert(
        "العميل المحدد غير موجود."
      );
      return;
    }

    let branchId =
      selectedClient.branch_id != null
        ? Number(selectedClient.branch_id)
        : form.branch_id
        ? Number(form.branch_id)
        : null;

    if (isBranchManager) {
      if (!currentUser.branch_id) {
        alert(
          "مدير الفرع غير مرتبط بأي فرع."
        );
        return;
      }

      if (
        selectedClient.branch_id != null &&
        Number(selectedClient.branch_id) !==
          Number(currentUser.branch_id)
      ) {
        alert(
          "لا يمكنك إنشاء عقد لعميل تابع لفرع آخر."
        );
        return;
      }

      branchId =
        Number(currentUser.branch_id);
    }

    if (
      !branchId &&
      !isBranchManager
    ) {
      alert(
        "تعذر تحديد فرع العقد. تأكدي من أن العميل مرتبط بفرع."
      );
      return;
    }

    if (
      form.start_date &&
      form.end_date &&
      form.end_date <
        form.start_date
    ) {
      alert(
        "تاريخ نهاية العقد لا يمكن أن يكون قبل تاريخ البداية."
      );
      return;
    }

    const contractValue =
      form.contract_value.trim() === ""
        ? null
        : Number(
            form.contract_value
          );

    if (
      contractValue !== null &&
      Number.isNaN(contractValue)
    ) {
      alert(
        "قيمة العقد يجب أن تكون رقمًا صحيحًا."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      contract_number:
        form.contract_number.trim(),

      contract_name:
        form.contract_name.trim(),

      client_id:
        Number(form.client_id),

      branch_id: branchId,

      start_date:
        form.start_date || null,

      end_date:
        form.end_date || null,

      contract_value:
        contractValue,

      status:
        form.status || "Active",

      description:
        form.description.trim() || null,
    };

    try {
      if (editingContract) {
        const {
          error,
        } = await supabase
          .from("contracts")
          .update(payload)
          .eq(
            "id",
            editingContract.id
          );

        if (error) {
          console.error(
            "UPDATE CONTRACT ERROR:",
            error
          );

          alert(
            error.message
          );
          return;
        }

        setSuccess(
          "تم تعديل العقد بنجاح."
        );
      } else {
        const {
          error,
        } = await supabase
          .from("contracts")
          .insert(payload);

        if (error) {
          console.error(
            "INSERT CONTRACT ERROR:",
            error
          );

          alert(
            error.message
          );
          return;
        }

        setSuccess(
          "تم إضافة العقد بنجاح."
        );
      }

      setOpenModal(false);
      setEditingContract(null);
      setForm(emptyForm);

      await loadContracts(
        currentUser
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteContract(
    contract: Contract
  ) {
    if (!canDelete) {
      alert(
        "ليس لديك صلاحية حذف العقود."
      );
      return;
    }

    const confirmed =
      confirm(
        `هل أنت متأكد من حذف العقد رقم "${contract.contract_number || contract.id}"؟\n\nلا يمكن التراجع عن هذه العملية.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    const {
      error,
    } = await supabase
      .from("contracts")
      .delete()
      .eq("id", contract.id);

    if (error) {
      console.error(
        "DELETE CONTRACT ERROR:",
        error
      );

      alert(
        error.message
      );

      return;
    }

    setSuccess(
      "تم حذف العقد بنجاح."
    );

    if (currentUser) {
      await loadContracts(
        currentUser
      );
    }
  }

  const filteredContracts =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return contracts.filter(
        (contract) => {
          const client =
            getClient(contract);

          const matchesSearch =
            !search ||
            [
              contract.contract_number,
              contract.contract_name,
              client?.client_name,
              client?.phone,
              client?.city,
              client?.contact_person,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(search);

          const normalizedStatus =
            (
              contract.status ||
              "Active"
            ).toLowerCase();

          const matchesStatus =
            statusFilter === "All" ||
            normalizedStatus ===
              statusFilter.toLowerCase();

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      contracts,
      searchTerm,
      statusFilter,
    ]);

  const activeContracts =
    contracts.filter(
      (contract) =>
        (
          contract.status ||
          "Active"
        ).toLowerCase() ===
        "active"
    ).length;

  const completedContracts =
    contracts.filter(
      (contract) =>
        (
          contract.status ||
          ""
        ).toLowerCase() ===
        "completed"
    ).length;

  return (
    <ProtectedRoute>
      <main
        className="min-h-screen bg-slate-100 p-6 md:p-8"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto">

          {/* Official Document Header */}
          <div className="bg-white border border-gray-300 rounded-xl shadow-sm mb-8 overflow-hidden">

            {/* Top row */}
            <div className="grid grid-cols-1 md:grid-cols-3 border-b border-gray-300">

              <div className="p-4 border-b md:border-b-0 md:border-l border-gray-300">
                <div className="text-xs text-gray-500 mb-1">
                  Document code
                </div>

                <div className="font-bold text-gray-800">
                  QF 701/01
                </div>
              </div>

              <div className="p-4 text-center border-b md:border-b-0 md:border-l border-gray-300">
                <div className="text-xs text-gray-500 mb-1">
                  Document Type
                </div>

                <div className="font-bold text-gray-800 text-lg">
                  Customer Contract
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-gray-500 mb-1">
                  Issue / Rev #
                </div>

                <div className="font-bold text-gray-800">
                  1/3
                </div>
              </div>

            </div>

            {/* Second row */}
            <div className="grid grid-cols-1 md:grid-cols-4">

              <div className="p-4 border-b md:border-b-0 md:border-l border-gray-300">
                <div className="text-xs text-gray-500 mb-1">
                  Issue Date
                </div>

                <div className="font-semibold text-gray-800">
                  31/12/2023
                </div>
              </div>

              <div className="p-4 border-b md:border-b-0 md:border-l border-gray-300">
                <div className="text-xs text-gray-500 mb-1">
                  Copy #
                </div>

                <div className="font-semibold text-gray-800">
                  -
                </div>
              </div>

              <div className="p-4 border-b md:border-b-0 md:border-l border-gray-300">
                <div className="text-xs text-gray-500 mb-1">
                  Revision Date
                </div>

                <div className="font-semibold text-gray-800">
                  31/12/2024
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-gray-500 mb-1">
                  Page
                </div>

                <div className="font-semibold text-gray-800">
                  Page 1 of 2
                </div>
              </div>

            </div>

          </div>

          {/* Page title */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">

            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                العقود
              </h1>

              <p className="text-gray-500 mt-2">
                إدارة ومتابعة عقود العملاء
              </p>

              {currentUser && (
                <div className="text-sm text-gray-400 mt-1">
                  الصلاحية:
                  <span className="font-semibold text-gray-600 mr-1">
                    {currentUser.role}
                  </span>
                </div>
              )}
            </div>

            {canManage && (
              <button
                type="button"
                onClick={openAddModal}
                className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-sm"
              >
                + إضافة عقد
              </button>
            )}

          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              <div className="font-semibold">
                حدث خطأ
              </div>

              <div className="text-sm mt-1">
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
              {success}
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-sm text-gray-500">
                إجمالي العقود
              </div>

              <div className="text-3xl font-bold text-blue-700 mt-1">
                {contracts.length}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-sm text-gray-500">
                العقود النشطة
              </div>

              <div className="text-3xl font-bold text-green-600 mt-1">
                {activeContracts}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-sm text-gray-500">
                العقود المكتملة
              </div>

              <div className="text-3xl font-bold text-purple-600 mt-1">
                {completedContracts}
              </div>
            </div>

          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">

              <input
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder="بحث برقم العقد أو الاسم أو العميل أو الهاتف..."
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="border border-gray-300 rounded-lg p-3 md:w-56"
              >
                <option value="All">
                  جميع الحالات
                </option>

                <option value="Active">
                  نشط
                </option>

                <option value="Completed">
                  مكتمل
                </option>

                <option value="Expired">
                  منتهي
                </option>

                <option value="Cancelled">
                  ملغي
                </option>

                <option value="Draft">
                  مسودة
                </option>
              </select>

            </div>
          </div>

          {/* Contracts */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
              جاري تحميل العقود...
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">

              <div className="text-5xl mb-4">
                📄
              </div>

              <h2 className="text-xl font-bold text-gray-700">
                لا توجد عقود
              </h2>

              <p className="text-gray-500 mt-2">
                لا توجد عقود مطابقة للبحث أو الفلتر المحدد.
              </p>

              {canManage && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-5 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg font-semibold"
                >
                  + إضافة أول عقد
                </button>
              )}

            </div>
          ) : (
            <div className="space-y-5">

              {filteredContracts.map(
                (contract) => {
                  const client =
                    getClient(
                      contract
                    );

                  const status =
                    (
                      contract.status ||
                      "Active"
                    ).toLowerCase();

                  return (
                    <div
                      key={contract.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                    >

                      {/* Contract Header */}
                      <div className="bg-slate-800 text-white p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                          <div>
                            <div className="text-sm text-slate-300 mb-1">
                              رقم العقد
                            </div>

                            <div className="text-2xl font-bold">
                              {contract.contract_number ||
                                "بدون رقم"}
                            </div>

                            <div className="text-slate-300 mt-2">
                              {contract.contract_name ||
                                "بدون اسم"}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">

                            <span
                              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                status ===
                                "active"
                                  ? "bg-green-500 text-white"
                                  : status ===
                                    "completed"
                                  ? "bg-blue-500 text-white"
                                  : status ===
                                    "expired"
                                  ? "bg-orange-500 text-white"
                                  : status ===
                                    "cancelled"
                                  ? "bg-red-500 text-white"
                                  : "bg-white/20 text-white"
                              }`}
                            >
                              {contract.status ||
                                "غير محدد"}
                            </span>

                          </div>

                        </div>
                      </div>

                      {/* Contract Body */}
                      <div className="p-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                          <div>
                            <div className="text-sm text-gray-500">
                              العميل
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {client?.client_name ||
                                "-"}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">
                              جهة الاتصال
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {client?.contact_person ||
                                "-"}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">
                              هاتف العميل
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {client?.phone ||
                                "-"}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">
                              المدينة
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {client?.city ||
                                "-"}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">
                              الفرع
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {getBranchName(
                                contract.branch_id
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">
                              قيمة العقد
                            </div>

                            <div className="font-bold text-blue-700 text-lg mt-1">
                              {contract.contract_value !==
                              null
                                ? `${Number(
                                    contract.contract_value
                                  ).toLocaleString(
                                    "ar-SA"
                                  )} ريال`
                                : "-"}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">
                              بداية العقد
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {formatDate(
                                contract.start_date
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">
                              نهاية العقد
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {formatDate(
                                contract.end_date
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">
                              رقم العميل
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {contract.client_id ||
                                "-"}
                            </div>
                          </div>

                        </div>

                        {contract.description && (
                          <div className="mt-7 pt-6 border-t border-gray-200">

                            <div className="text-sm text-gray-500 mb-2">
                              وصف العقد
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 text-gray-700 leading-7">
                              {contract.description}
                            </div>

                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-6 pt-5 border-t border-gray-200 flex flex-wrap gap-3">

                          {/* Print / PDF */}
                          <button
                            type="button"
                            onClick={() =>
                              printContract(
                                contract
                              )
                            }
                            className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-semibold"
                          >
                            🖨️ طباعة / PDF
                          </button>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    contract
                                  )
                                }
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-lg font-semibold"
                              >
                                تعديل العقد
                              </button>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteContract(
                                      contract
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold"
                                >
                                  حذف العقد
                                </button>
                              )}

                              {client?.id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `/clients/${client.id}`
                                    )
                                  }
                                  className="bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-lg font-semibold"
                                >
                                  فتح ملف العميل
                                </button>
                              )}
                            </>
                          )}

                        </div>

                        <div className="mt-5 pt-4 border-t border-gray-100 text-sm text-gray-400 flex flex-wrap gap-5">

                          <div>
                            رقم السجل:
                            <span className="font-semibold text-gray-600 mr-2">
                              {contract.id}
                            </span>
                          </div>

                          <div>
                            تاريخ الإنشاء:
                            <span className="font-semibold text-gray-600 mr-2">
                              {formatDate(
                                contract.created_at
                              )}
                            </span>
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                }
              )}

            </div>
          )}

          {/* Modal */}
          {openModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">

                <div className="bg-slate-800 text-white px-6 py-5 flex items-center justify-between">

                  <div>
                    <h2 className="text-xl font-bold">
                      {editingContract
                        ? "تعديل العقد"
                        : "إضافة عقد جديد"}
                    </h2>

                    <p className="text-slate-300 text-sm mt-1">
                      أدخل بيانات العقد الأساسية
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="text-white text-2xl hover:text-gray-300"
                  >
                    ×
                  </button>

                </div>

                <form
                  onSubmit={saveContract}
                  className="p-6"
                >

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Contract Number */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        رقم العقد *
                      </label>

                      <input
                        value={
                          form.contract_number
                        }
                        onChange={(e) =>
                          setForm(
                            (prev) => ({
                              ...prev,
                              contract_number:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="مثال: CNT-2026-001"
                        className="w-full border border-gray-300 rounded-lg p-3"
                        required
                      />
                    </div>

                    {/* Contract Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        اسم العقد *
                      </label>

                      <input
                        value={
                          form.contract_name
                        }
                        onChange={(e) =>
                          setForm(
                            (prev) => ({
                              ...prev,
                              contract_name:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="مثال: عقد اختبارات التربة"
                        className="w-full border border-gray-300 rounded-lg p-3"
                        required
                      />
                    </div>

                    {/* Client */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        العميل *
                      </label>

                      <select
                        value={
                          form.client_id
                        }
                        onChange={(e) =>
                          handleClientChange(
                            e.target.value
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg p-3"
                        required
                      >
                        <option value="">
                          اختر العميل
                        </option>

                        {clients.map(
                          (client) => (
                            <option
                              key={
                                client.id
                              }
                              value={
                                client.id
                              }
                            >
                              {client.client_name ||
                                `عميل ${client.id}`}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Branch */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        الفرع
                      </label>

                      <select
                        value={
                          form.branch_id
                        }
                        onChange={(e) =>
                          setForm(
                            (prev) => ({
                              ...prev,
                              branch_id:
                                e.target.value,
                            })
                          )
                        }
                        disabled={
                          isBranchManager ||
                          Boolean(
                            form.client_id &&
                              clients.find(
                                (c) =>
                                  String(
                                    c.id
                                  ) ===
                                  form.client_id
                              )?.branch_id
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg p-3 disabled:bg-gray-100"
                      >
                        <option value="">
                          اختر الفرع
                        </option>

                        {branches.map(
                          (branch) => (
                            <option
                              key={
                                branch.id
                              }
                              value={
                                branch.id
                              }
                            >
                              {getBranchName(
                                branch.id
                              )}
                            </option>
                          )
                        )}
                      </select>

                      <p className="text-xs text-gray-400 mt-1">
                        يتم تحديد الفرع تلقائيًا حسب العميل.
                      </p>
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        تاريخ البداية
                      </label>

                      <input
                        type="date"
                        value={
                          form.start_date
                        }
                        onChange={(e) =>
                          setForm(
                            (prev) => ({
                              ...prev,
                              start_date:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg p-3"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        تاريخ النهاية
                      </label>

                      <input
                        type="date"
                        value={
                          form.end_date
                        }
                        onChange={(e) =>
                          setForm(
                            (prev) => ({
                              ...prev,
                              end_date:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg p-3"
                      />
                    </div>

                    {/* Value */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        قيمة العقد
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          form.contract_value
                        }
                        onChange={(e) =>
                          setForm(
                            (prev) => ({
                              ...prev,
                              contract_value:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="مثال: 150000"
                        className="w-full border border-gray-300 rounded-lg p-3"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        حالة العقد
                      </label>

                      <select
                        value={
                          form.status
                        }
                        onChange={(e) =>
                          setForm(
                            (prev) => ({
                              ...prev,
                              status:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg p-3"
                      >
                        <option value="Active">
                          نشط
                        </option>

                        <option value="Completed">
                          مكتمل
                        </option>

                        <option value="Expired">
                          منتهي
                        </option>

                        <option value="Cancelled">
                          ملغي
                        </option>

                        <option value="Draft">
                          مسودة
                        </option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        وصف العقد
                      </label>

                      <textarea
                        value={
                          form.description
                        }
                        onChange={(e) =>
                          setForm(
                            (prev) => ({
                              ...prev,
                              description:
                                e.target.value,
                            })
                          )
                        }
                        rows={5}
                        placeholder="اكتب تفاصيل أو ملاحظات العقد..."
                        className="w-full border border-gray-300 rounded-lg p-3 resize-none"
                      />
                    </div>

                  </div>

                  {/* Buttons */}
                  <div className="mt-7 pt-5 border-t border-gray-200 flex justify-end gap-3">

                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={saving}
                      className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      إلغاء
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold disabled:opacity-50"
                    >
                      {saving
                        ? "جاري الحفظ..."
                        : editingContract
                        ? "حفظ التعديلات"
                        : "إضافة العقد"}
                    </button>

                  </div>

                </form>

              </div>
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}