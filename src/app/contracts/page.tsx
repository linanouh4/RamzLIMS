
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
  phone?: string | null;
  city?: string | null;
  email?: string | null;
  address?: string | null;
  contact_person?: string | null;
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

type ContractSigning = {
  id: number;
  contract_id: number;
  signing_token: string;
  status: string;
  customer_signed_by: string | null;
  customer_signature: string | null;
  customer_stamp_url: string | null;
  sent_at: string | null;
  opened_at: string | null;
  customer_signed_at: string | null;
  approved_by: number | null;
  ramz_signature: string | null;
  ramz_stamp_url: string | null;
  approved_at: string | null;
  ramz_signed_at: string | null;
  ramz_stamped_at: string | null;
  finalized_at: string | null;
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

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [signings, setSignings] = useState<Record<number, ContractSigning>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [openModal, setOpenModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(
    null
  );

  const [form, setForm] = useState<ContractForm>(emptyForm);

  const [signingContract, setSigningContract] = useState<Contract | null>(
    null
  );
  const [signingLink, setSigningLink] = useState("");

  const [sendingContractId, setSendingContractId] = useState<number | null>(
    null
  );

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const isTechnicalManager =
    currentUser?.role?.toLowerCase() === "technical_manager";
  const isBranchManager =
    currentUser?.role?.toLowerCase() === "branch_manager";

  const canManage = isAdmin || isTechnicalManager || isBranchManager;
  const canDelete = isAdmin;

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (!success && !error) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [success, error]);

  async function initializePage() {
    try {
      setLoading(true);
      setError("");

      const savedUser = getSavedUser();

      if (!savedUser?.id) {
        router.push("/login");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, role, branch_id")
        .eq("id", savedUser.id)
        .single();

      if (userError) {
        throw userError;
      }

      const user: CurrentUser = {
        id: Number(userData.id),
        role: String(userData.role || ""),
        branch_id:
          userData.branch_id === null || userData.branch_id === undefined
            ? null
            : Number(userData.branch_id),
      };

      setCurrentUser(user);

      await Promise.all([
        loadContracts(user),
        loadClients(user),
        loadBranches(),
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "حدث خطأ أثناء تحميل العقود");
    } finally {
      setLoading(false);
    }
  }

  async function loadContracts(user: CurrentUser) {
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
      .order("created_at", { ascending: false });

    if (user.role.toLowerCase() === "branch_manager") {
      query = query.eq("branch_id", user.branch_id);
    }

    const { data, error: contractsError } = await query;

    if (contractsError) {
      throw contractsError;
    }

    setContracts((data || []) as Contract[]);

    await loadContractSignings();
  }

  async function loadContractSignings() {
    const { data, error: signingError } = await supabase
      .from("contract_signing")
      .select(`
        id,
        contract_id,
        signing_token,
        status,
        verification_code,
        customer_signed_by,
        customer_signature,
        customer_stamp_url,
        sent_at,
        opened_at,
        customer_signed_at,
        approved_by,
        ramz_signature,
        ramz_stamp_url,
        approved_at,
        ramz_signed_at,
        ramz_stamped_at,
        finalized_at
      `);

    if (signingError) {
      throw signingError;
    }

    const mapped: Record<number, ContractSigning> = {};

    (data || []).forEach((item: any) => {
      mapped[Number(item.contract_id)] = item as ContractSigning;
    });

    setSignings(mapped);
  }

  async function loadClients(user: CurrentUser) {
    let query = supabase
      .from("clients")
      .select(`
        id,
        client_name,
        phone,
        city,
        email,
        address,
        contact_person,
        branch_id,
        status
      `)
      .order("client_name", { ascending: true });

    if (user.role.toLowerCase() === "branch_manager") {
      query = query.eq("branch_id", user.branch_id);
    }

    const { data, error: clientsError } = await query;

    if (clientsError) {
      throw clientsError;
    }

    setClients((data || []) as Client[]);
  }

  async function loadBranches() {
    const { data, error: branchesError } = await supabase
      .from("branches")
      .select("*")
      .order("id", { ascending: true });

    if (branchesError) {
      throw branchesError;
    }

    setBranches(data || []);
  }

  function getClient(contract: Contract) {
    if (Array.isArray(contract.clients)) {
      return contract.clients[0] || null;
    }

    return contract.clients || null;
  }

  function getBranchName(branchId: number | null) {
    if (!branchId) {
      return "-";
    }

    const branch = branches.find((item) => Number(item.id) === Number(branchId));

    if (!branch) {
      return `Branch ${branchId}`;
    }

    return (
      branch.branch_name ||
      branch.name ||
      branch.title ||
      branch.code ||
      `Branch ${branchId}`
    );
  }

  function formatDate(value: string | null) {
    if (!value) {
      return "-";
    }

    try {
      return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB");
    } catch {
      return value;
    }
  }

  function formatDateTime(value: string | null) {
    if (!value) {
      return "-";
    }

    try {
      return new Date(value).toLocaleString("en-GB", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return value;
    }
  }

  function escapeHtml(value: unknown) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getSigningStatusLabel(signing: ContractSigning | undefined) {
    if (!signing) {
      return "غير مرسل";
    }

    switch (signing.status) {
      case "Draft":
        return "مسودة";
      case "Sent":
        return "تم إرسال الرابط";
      case "Opened":
        return "تم فتح الرابط";
      case "Customer Signed":
        return "تم توقيع العميل";
      case "Pending Ramz Approval":
        return "بانتظار اعتماد رامز";
      case "Approved":
        return "تم اعتماد العقد";
      case "Finalized":
        return "العقد نهائي";
      default:
        return signing.status;
    }
  }

  function getSigningStatusClass(signing: ContractSigning | undefined) {
    if (!signing) {
      return "bg-gray-100 text-gray-700";
    }

    switch (signing.status) {
      case "Sent":
        return "bg-blue-100 text-blue-700";
      case "Opened":
        return "bg-indigo-100 text-indigo-700";
      case "Customer Signed":
        return "bg-purple-100 text-purple-700";
      case "Pending Ramz Approval":
        return "bg-orange-100 text-orange-700";
      case "Approved":
        return "bg-green-100 text-green-700";
      case "Finalized":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function canSendSigning(signing: ContractSigning | undefined) {
    if (!signing) {
      return true;
    }

    return ["Draft", "Sent", "Opened"].includes(signing.status);
  }

  const filteredContracts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return contracts.filter((contract) => {
      const client = getClient(contract);
      const signing = signings[contract.id];

      const matchesSearch =
        !term ||
        String(contract.contract_number || "")
          .toLowerCase()
          .includes(term) ||
        String(contract.contract_name || "")
          .toLowerCase()
          .includes(term) ||
        String(client?.client_name || "")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "All" ||
        String(contract.status || "") === statusFilter;

      const matchesBranch =
        !currentUser ||
        currentUser.role.toLowerCase() !== "branch_manager" ||
        Number(contract.branch_id) === Number(currentUser.branch_id);

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [
    contracts,
    clients,
    signings,
    searchTerm,
    statusFilter,
    currentUser,
  ]);

  function openCreateModal() {
    setEditingContract(null);

    setForm({
      ...emptyForm,
      branch_id:
        isBranchManager && currentUser?.branch_id
          ? String(currentUser.branch_id)
          : "",
    });

    setError("");
    setSuccess("");
    setOpenModal(true);
  }

  function openEditModal(contract: Contract) {
    const signing = signings[contract.id];

    if (signing?.status === "Finalized") {
      setError("لا يمكن تعديل عقد تم إنهاؤه واعتماده نهائيًا.");
      return;
    }

    setEditingContract(contract);

    setForm({
      contract_number: contract.contract_number || "",
      contract_name: contract.contract_name || "",
      client_id: contract.client_id ? String(contract.client_id) : "",
      branch_id: contract.branch_id ? String(contract.branch_id) : "",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      contract_value:
        contract.contract_value !== null &&
        contract.contract_value !== undefined
          ? String(contract.contract_value)
          : "",
      status: contract.status || "Active",
      description: contract.description || "",
    });

    setError("");
    setSuccess("");
    setOpenModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setOpenModal(false);
    setEditingContract(null);
    setForm(emptyForm);
  }

  async function saveContract() {
    if (!canManage) {
      setError("ليس لديك صلاحية لإدارة العقود.");
      return;
    }

    if (!form.contract_number.trim()) {
      setError("رقم العقد مطلوب.");
      return;
    }

    if (!form.contract_name.trim()) {
      setError("اسم العقد مطلوب.");
      return;
    }

    if (!form.client_id) {
      setError("يجب اختيار العميل.");
      return;
    }

    if (!form.branch_id) {
      setError("يجب اختيار الفرع.");
      return;
    }

    if (isBranchManager && currentUser?.branch_id) {
      if (Number(form.branch_id) !== Number(currentUser.branch_id)) {
        setError("لا يمكنك إنشاء أو تعديل عقد خارج فرعك.");
        return;
      }
    }

    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setError("تاريخ نهاية العقد لا يمكن أن يكون قبل تاريخ البداية.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        contract_number: form.contract_number.trim(),
        contract_name: form.contract_name.trim(),
        client_id: Number(form.client_id),
        branch_id: Number(form.branch_id),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        contract_value: form.contract_value
          ? Number(form.contract_value)
          : null,
        status: form.status,
        description: form.description.trim() || null,
      };

      if (editingContract) {
        const { error: updateError } = await supabase
          .from("contracts")
          .update(payload)
          .eq("id", editingContract.id);

        if (updateError) {
          throw updateError;
        }

        setSuccess("تم تحديث العقد بنجاح.");
      } else {
        const { error: insertError } = await supabase
          .from("contracts")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setSuccess("تم إنشاء العقد بنجاح.");
      }

      setOpenModal(false);
      setEditingContract(null);
      setForm(emptyForm);

      if (currentUser) {
        await loadContracts(currentUser);
        await loadClients(currentUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "حدث خطأ أثناء حفظ العقد.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContract(contract: Contract) {
    if (!canDelete) {
      setError("حذف العقود متاح للمدير فقط.");
      return;
    }

    const signing = signings[contract.id];

    if (signing?.status === "Finalized") {
      setError("لا يمكن حذف عقد تم إنهاؤه نهائيًا.");
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف العقد "${contract.contract_number || ""}"؟`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const { error: deleteError } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contract.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess("تم حذف العقد بنجاح.");

      if (currentUser) {
        await loadContracts(currentUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "حدث خطأ أثناء حذف العقد.");
    }
  }

  async function sendSigningLink(contract: Contract) {
    if (!canManage) {
      setError("ليس لديك صلاحية لإرسال رابط التوقيع.");
      return;
    }

    const existingSigning = signings[contract.id];

    if (!canSendSigning(existingSigning)) {
      setError("لا يمكن إعادة إرسال رابط لهذا العقد في حالته الحالية.");
      return;
    }

    try {
      setSendingContractId(contract.id);
      setError("");
      setSuccess("");

      let token = existingSigning?.signing_token || "";

      if (existingSigning) {
        const { error: updateError } = await supabase
          .from("contract_signing")
          .update({
            status: "Sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", existingSigning.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { data, error: insertError } = await supabase
          .from("contract_signing")
          .insert({
            contract_id: contract.id,
            status: "Sent",
            sent_at: new Date().toISOString(),
          })
          .select("id, contract_id, signing_token, status, sent_at")
          .single();

        if (insertError) {
          throw insertError;
        }

        token = data.signing_token;
      }

      if (!token) {
        throw new Error("تعذر إنشاء رمز توقيع للعقد.");
      }

      await loadContractSignings();

      const link = `${window.location.origin}/contract-approval/${token}`;

      setSigningContract(contract);
      setSigningLink(link);

      setSuccess("تم تجهيز رابط توقيع العميل.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "حدث خطأ أثناء إنشاء رابط التوقيع.");
    } finally {
      setSendingContractId(null);
    }
  }

  async function copySigningLink() {
    if (!signingLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(signingLink);
      setSuccess("تم نسخ رابط التوقيع.");
    } catch {
      setError("تعذر نسخ الرابط تلقائيًا. انسخه يدويًا.");
    }
  }

  function closeSigningModal() {
    setSigningContract(null);
    setSigningLink("");
  }

  function printContract(contract: Contract) {
  const client = getClient(contract);
  const signing = signings[contract.id];

  const contractNumber = escapeHtml(contract.contract_number || "-");
  const contractName = escapeHtml(contract.contract_name || "-");

  const clientName = escapeHtml(client?.client_name || "-");
  const customerRepresentative = escapeHtml(
    signing?.customer_signed_by ||
      client?.contact_person ||
      "-"
  );

  const branchName = escapeHtml(
    getBranchName(contract.branch_id)
  );

  const startDate = escapeHtml(
    formatDate(contract.start_date)
  );

  const endDate = escapeHtml(
    formatDate(contract.end_date)
  );

  const contractValue =
    contract.contract_value !== null &&
    contract.contract_value !== undefined
      ? escapeHtml(
          Number(contract.contract_value).toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )
        )
      : "-";

  const description = escapeHtml(
    contract.description || "لا يوجد وصف."
  );

  const customerSignature = signing?.customer_signature
    ? `<img
        class="signature-image"
        src="${escapeHtml(signing.customer_signature)}"
        alt="توقيع ممثل العميل"
      />`
    : `<div class="empty-signature">
        لم يتم توقيع العميل
      </div>`;

  const customerStamp = signing?.customer_stamp_url
    ? `<img
        class="stamp-image"
        src="${escapeHtml(signing.customer_stamp_url)}"
        alt="ختم العميل"
      />`
    : `<div class="empty-stamp">
        لا يوجد ختم
      </div>`;

  const ramzSignature = signing?.ramz_signature
    ? `<img
        class="signature-image"
        src="${escapeHtml(signing.ramz_signature)}"
        alt="توقيع مدير المختبر"
      />`
    : `<div class="empty-signature">
        لم يتم اعتماد توقيع رامز
      </div>`;

  const ramzStamp = signing?.ramz_stamp_url
    ? `<img
        class="stamp-image"
        src="${escapeHtml(signing.ramz_stamp_url)}"
        alt="ختم شركة رمز الإمارات"
      />`
    : `<div class="empty-stamp">
        لا يوجد ختم رامز
      </div>`;

  const customerSignedAt = escapeHtml(
    formatDateTime(
      signing?.customer_signed_at || null
    )
  );

  const finalizedAt = escapeHtml(
    formatDateTime(
      signing?.finalized_at || null
    )
  );

  const printWindow = window.open(
    "",
    "_blank"
  );

  if (!printWindow) {
    setError(
      "تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة."
    );
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
  <meta charset="UTF-8" />

  <title>
    عقد ${contractNumber}
  </title>

  <style>

    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-family:
        Arial,
        "Tahoma",
        sans-serif;
      direction: rtl;
      font-size: 12px;
      line-height: 1.7;
    }

    .page {
      width: 100%;
    }

    .header {
      border: 1px solid #1f2937;
      margin-bottom: 18px;
    }

    .header-main {
      display: grid;
      grid-template-columns:
        1fr
        2fr
        1fr;

      border-bottom:
        1px solid #1f2937;
    }

    .header-cell {
      padding: 8px;
      text-align: center;

      border-left:
        1px solid #1f2937;
    }

    .header-cell:last-child {
      border-left: none;
    }

    .header-label {
      display: block;
      font-size: 9px;
      color: #6b7280;
      margin-bottom: 3px;
    }

    .header-value {
      display: block;
      font-weight: bold;
      font-size: 11px;
    }

    .title {
      font-size: 18px;
      font-weight: bold;
    }

    .header-info {
      display: grid;
      grid-template-columns:
        repeat(4, 1fr);
    }

    .section {
      margin-bottom: 16px;
      border:
        1px solid #9ca3af;
    }

    .section-title {
      padding: 7px 10px;
      background: #f3f4f6;
      border-bottom:
        1px solid #9ca3af;

      font-size: 13px;
      font-weight: bold;
    }

    .section-body {
      padding: 10px;
    }

    .contract-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;

      margin-bottom: 10px;
    }

    .contract-number {
      font-size: 17px;
      font-weight: bold;
    }

    .contract-name {
      margin-top: 3px;
      font-size: 14px;
      font-weight: bold;
    }

    .grid {
      display: grid;
      grid-template-columns:
        repeat(2, 1fr);

      border-top:
        1px solid #d1d5db;

      border-right:
        1px solid #d1d5db;
    }

    .field {
      padding: 8px;

      border-left:
        1px solid #d1d5db;

      border-bottom:
        1px solid #d1d5db;
    }

    .field-label {
      display: block;

      font-size: 9px;
      color: #6b7280;

      margin-bottom: 2px;
    }

    .field-value {
      font-size: 11px;
      font-weight: bold;
    }

    .description {
      min-height: 80px;
      white-space: pre-wrap;
    }

    /*
     * التوقيعات النهائية
     */

    .signature-section {
      margin-top: 25px;

      border:
        1px solid #1f2937;

      page-break-inside: avoid;
    }

    .signature-heading {
      padding: 8px;

      text-align: center;

      background: #f3f4f6;

      border-bottom:
        1px solid #1f2937;

      font-size: 14px;
      font-weight: bold;
    }

    .signature-columns {
      display: grid;

      grid-template-columns:
        1fr 1fr;
    }

    .signature-column {
      min-height: 300px;

      padding: 15px;

      text-align: center;

      border-left:
        1px solid #1f2937;
    }

    .signature-column:last-child {
      border-left: none;
    }

    .party-title {
      font-size: 14px;
      font-weight: bold;

      margin-bottom: 10px;
    }

    .party-company {
      min-height: 50px;

      font-size: 12px;
      font-weight: bold;

      margin-bottom: 8px;
    }

    .party-name {
      min-height: 35px;

      font-size: 12px;
      font-weight: bold;

      margin-bottom: 8px;
    }

    .signature-label {
      font-size: 10px;
      color: #6b7280;

      margin-top: 8px;
      margin-bottom: 3px;
    }

    .signature-area {
      height: 85px;

      display: flex;
      align-items: center;
      justify-content: center;

      border-bottom:
        1px solid #9ca3af;
    }

    .signature-image {
      max-width: 210px;
      max-height: 75px;

      object-fit: contain;
    }

    .stamp-area {
      height: 85px;

      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stamp-image {
      max-width: 115px;
      max-height: 75px;

      object-fit: contain;
    }

    .empty-signature,
    .empty-stamp {
      color: #9ca3af;
      font-size: 10px;
    }

    .date-line {
      margin-top: 10px;

      display: flex;
      justify-content: center;
      gap: 5px;

      font-size: 10px;
      color: #4b5563;
    }

    .footer {
      margin-top: 20px;

      padding-top: 8px;

      border-top:
        1px solid #d1d5db;

      text-align: center;

      font-size: 9px;
      color: #6b7280;
    }

    @media print {

      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .signature-section {
        page-break-inside: avoid;
      }

    }

  </style>
</head>

<body>

  <div class="page">

    <!-- رأس العقد -->

    <div class="header">

      <div class="header-main">

        <div class="header-cell">
          <span class="header-label">
            رمز النموذج
          </span>

          <span class="header-value">
            QF 701/01
          </span>
        </div>

        <div class="header-cell">

          <span class="header-label">
            نوع الوثيقة
          </span>

          <span class="header-value title">
            عقد خدمات فحص التربة والخرسانة
          </span>

        </div>

        <div class="header-cell">

          <span class="header-label">
            رقم العقد
          </span>

          <span class="header-value">
            ${contractNumber}
          </span>

        </div>

      </div>

      <div class="header-info">

        <div class="header-cell">

          <span class="header-label">
            الفرع
          </span>

          <span class="header-value">
            ${branchName}
          </span>

        </div>

        <div class="header-cell">

          <span class="header-label">
            بداية العقد
          </span>

          <span class="header-value">
            ${startDate}
          </span>

        </div>

        <div class="header-cell">

          <span class="header-label">
            نهاية العقد
          </span>

          <span class="header-value">
            ${endDate}
          </span>

        </div>

        <div class="header-cell">

          <span class="header-label">
            قيمة العقد
          </span>

          <span class="header-value">
            ${contractValue} ريال
          </span>

        </div>

      </div>

    </div>


    <!-- بيانات العقد -->

    <div class="section">

      <div class="section-title">
        بيانات العقد
      </div>

      <div class="section-body">

        <div class="contract-title">

          <div>

            <div class="contract-number">
              ${contractNumber}
            </div>

            <div class="contract-name">
              ${contractName}
            </div>

          </div>

        </div>


        <div class="grid">

          <div class="field">

            <span class="field-label">
              اسم الشركة / العميل
            </span>

            <span class="field-value">
              ${clientName}
            </span>

          </div>


          <div class="field">

            <span class="field-label">
              ممثل العميل
            </span>

            <span class="field-value">
              ${customerRepresentative}
            </span>

          </div>

          <div class="field">

            <span class="field-label">
              المدينة
            </span>

            <span class="field-value">
              ${escapeHtml(client?.city || "-")}
            </span>

          </div>

          <div class="field">

            <span class="field-label">
              رقم الهاتف
            </span>

            <span class="field-value">
              ${escapeHtml(client?.phone || "-")}
            </span>

          </div>

        </div>

      </div>

    </div>


    <!-- وصف / بنود العقد -->

    <div class="section">

      <div class="section-title">
        بنود العقد
      </div>

      <div class="section-body">

        <div class="description">
          ${description}
        </div>

      </div>

    </div>


    <!-- التوقيعات -->

    <div class="signature-section">

      <div class="signature-heading">
        التوقيعات والاعتماد
      </div>


      <div class="signature-columns">


        <!-- العميل -->

        <div class="signature-column">

          <div class="party-title">
            ممثل العميل
          </div>


          <div class="party-company">
            السادة / ${clientName}
          </div>


          <div class="party-name">
            ${customerRepresentative}
          </div>


          <div class="signature-label">
            توقيع ممثل العميل
          </div>

          <div class="signature-area">
            ${customerSignature}
          </div>


          <div class="signature-label">
            ختم العميل
          </div>

          <div class="stamp-area">
            ${customerStamp}
          </div>


          <div class="date-line">
            <span>
              تاريخ التوقيع:
            </span>

            <strong>
              ${customerSignedAt}
            </strong>
          </div>

        </div>


        <!-- رامز الإمارات -->

        <div class="signature-column">

          <div class="party-title">
            المدير الفني لشركة رمز الإمارات
            لفحص التربة والخرسانة
          </div>


          <div class="party-company">
            شركة رمز الإمارات
            لفحص التربة والخرسانة
          </div>


          <div class="party-name">
            مدير المختبر م. لينا نوح
          </div>


          <div class="signature-label">
            التوقيع
          </div>

          <div class="signature-area">
            ${ramzSignature}
          </div>


          <div class="signature-label">
            ختم شركة رمز الإمارات
          </div>

          <div class="stamp-area">
            ${ramzStamp}
          </div>


          <div class="date-line">
            <span>
              تاريخ الاعتماد:
            </span>

            <strong>
              ${finalizedAt}
            </strong>
          </div>

        </div>


      </div>

    </div>


    <div class="footer">

      شركة رمز الإمارات لفحص التربة والخرسانة
      |
      عقد خدمات فحص التربة والخرسانة
      |
      ${contractNumber}

    </div>

  </div>

</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      console.error(err);
    }
  }, 500);
}

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
  <div className="flex items-start gap-3">
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      }}
      className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl font-bold text-gray-700 transition hover:bg-gray-100 hover:text-blue-600"
      title="رجوع"
      aria-label="رجوع"
    >
      ←
    </button>

    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        العقود
      </h1>

      <p className="mt-1 text-sm text-gray-500">
        إدارة عقود العملاء ومتابعة حالة التوقيع الإلكتروني
      </p>
    </div>
  </div>

  {canManage && (
    <button
      type="button"
      onClick={openCreateModal}
      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
    >
      + إنشاء عقد جديد
    </button>
  )}
</div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {success}
            </div>
          )}

          <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  بحث
                </label>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="رقم العقد أو اسم العقد أو العميل..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  حالة العقد
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="All">الكل</option>
                  <option value="Active">نشط</option>
                  <option value="Expired">منتهي</option>
                  <option value="Suspended">موقوف</option>
                  <option value="Completed">مكتمل</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              <p className="text-sm text-gray-500">جاري تحميل العقود...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <div className="mb-3 text-4xl">📄</div>
              <h2 className="text-lg font-bold text-gray-800">
                لا توجد عقود
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                لم يتم العثور على عقود مطابقة للبحث الحالي.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-right">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-4 text-xs font-bold text-gray-600">
                        رقم العقد
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-600">
                        العقد
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-600">
                        العميل
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-600">
                        الفرع
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-600">
                        المدة
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-600">
                        الحالة
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-600">
                        التوقيع
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-gray-600">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredContracts.map((contract) => {
                      const client = getClient(contract);
                      const signing = signings[contract.id];

                      return (
                        <tr
                          key={contract.id}
                          className="border-b border-gray-100 transition hover:bg-gray-50"
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="font-bold text-gray-900">
                              {contract.contract_number || "-"}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="font-semibold text-gray-900">
                              {contract.contract_name || "-"}
                            </div>

                            {contract.contract_value !== null &&
                              contract.contract_value !== undefined && (
                                <div className="mt-1 text-xs text-gray-500">
                                  القيمة:{" "}
                                  {Number(
                                    contract.contract_value
                                  ).toLocaleString("en-US")}
                                </div>
                              )}
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="font-semibold text-gray-800">
                              {client?.client_name || "-"}
                            </div>

                            {client?.contact_person && (
                              <div className="mt-1 text-xs text-gray-500">
                                {client.contact_person}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-gray-700">
                            {getBranchName(contract.branch_id)}
                          </td>

                          <td className="px-4 py-4 align-top text-xs text-gray-600">
                            <div>{formatDate(contract.start_date)}</div>
                            <div className="my-1 text-gray-400">إلى</div>
                            <div>{formatDate(contract.end_date)}</div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                contract.status === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : contract.status === "Completed"
                                  ? "bg-blue-100 text-blue-700"
                                  : contract.status === "Expired"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {contract.status === "Active"
                                ? "نشط"
                                : contract.status === "Completed"
                                ? "مكتمل"
                                : contract.status === "Expired"
                                ? "منتهي"
                                : contract.status === "Suspended"
                                ? "موقوف"
                                : contract.status || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getSigningStatusClass(
                                signing
                              )}`}
                            >
                              {getSigningStatusLabel(signing)}
                            </span>

                            {signing?.customer_signed_by && (
                              <div className="mt-2 text-xs text-gray-500">
                                {signing.customer_signed_by}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex min-w-[170px] flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => printContract(contract)}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                              >
                                🖨️ طباعة
                              </button>

                              {canManage && canSendSigning(signing) && (
                                <button
                                  type="button"
                                  onClick={() => sendSigningLink(contract)}
                                  
                                  disabled={sendingContractId === contract.id}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {sendingContractId === contract.id
                                    ? "جاري تجهيز الرابط..."
                                    : signing
                                    ? "🔗 إعادة إرسال الرابط"
                                    : "🔗 إرسال رابط التوقيع"}
                                </button>
                              )}
{currentUser?.role?.toLowerCase() === "admin" &&
  signing?.status === "Pending Ramz Approval" && (
    <button
      type="button"
      onClick={() =>
        router.push(`/contract-approval-admin/${contract.id}`)
      }
      className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
    >
      🔐 اعتماد العقد
    </button>
  )}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(contract)}
                                  disabled={signing?.status === "Finalized"}
                                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  ✏️ تعديل
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => deleteContract(contract)}
                                  disabled={signing?.status === "Finalized"}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  🗑️ حذف
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingContract ? "تعديل العقد" : "إنشاء عقد جديد"}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    أدخل بيانات العقد الأساسية
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    رقم العقد *
                  </label>

                  <input
                    type="text"
                    value={form.contract_number}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        contract_number: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="مثال: CTR-2026-0001"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    اسم العقد *
                  </label>

                  <input
                    type="text"
                    value={form.contract_name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        contract_name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="اسم المشروع أو العقد"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    العميل *
                  </label>

                  <select
                    value={form.client_id}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        client_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">اختر العميل</option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.client_name || `Client ${client.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    الفرع *
                  </label>

                  <select
                    value={form.branch_id}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        branch_id: event.target.value,
                      }))
                    }
                    disabled={isBranchManager}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  >
                    <option value="">اختر الفرع</option>

                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {getBranchName(branch.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    تاريخ البداية
                  </label>

                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        start_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    تاريخ النهاية
                  </label>

                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        end_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    قيمة العقد
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={form.contract_value}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        contract_value: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    حالة العقد
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Active">نشط</option>
                    <option value="Expired">منتهي</option>
                    <option value="Suspended">موقوف</option>
                    <option value="Completed">مكتمل</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    وصف العقد
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={5}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="أدخل وصف العقد أو الملاحظات..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={saveContract}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingContract
                    ? "حفظ التعديلات"
                    : "إنشاء العقد"}
                </button>
              </div>
            </div>
          </div>
        )}

        {signingContract && signingLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-gray-200 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      رابط توقيع العميل
                    </h2>

                    <p className="mt-1 text-xs text-gray-500">
                      {signingContract.contract_number} -{" "}
                      {signingContract.contract_name}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeSigningModal}
                    className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-2 text-sm font-bold text-blue-900">
                    تم إنشاء رابط التوقيع
                  </p>

                  <p className="text-xs leading-6 text-blue-800">
                    أرسل هذا الرابط للعميل. العميل سيتمكن من فتح العقد ومراجعته
                    وتوقيعه وإضافة ختم شركته بدون تسجيل دخول.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    رابط التوقيع
                  </label>

                  <textarea
                    readOnly
                    value={signingLink}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={copySigningLink}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    📋 نسخ الرابط
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(signingLink, "_blank")}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100"
                  >
                    🔗 فتح الرابط
                  </button>
                </div>

                <button
                  type="button"
                  onClick={closeSigningModal}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

