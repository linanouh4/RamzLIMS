
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";

type Client = {
  id?: number;
  client_name: string;
  phone: string;
  city: string;
  email: string;
  address: string;
  national_id?: string;
  commercial_registration?: string;
  contact_person?: string;
  company_type?: string;
  status: string;
  branch_id?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: Client | null;
  branchId?: number | null;
};

export default function AddClientModal({
  open,
  onClose,
  onSaved,
  client,
  branchId,
}: Props) {
  const { language } = useLanguage();
  const tr = (ar: string, en: string) => language === "ar" ? ar : en;
  const [clientName, setClientName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [registration, setRegistration] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setClientName(client.client_name || "");
      setNationalId(client.national_id || "");
      setRegistration(client.commercial_registration || "");
      setPhone(client.phone || "");
      setCity(client.city || "");
      setEmail(client.email || "");
      setAddress(client.address || "");
      setContactPerson(client.contact_person || "");
      setCompanyType(client.company_type || "");
    } else {
      clearForm();
    }
  }, [client, open]);

  function clearForm() {
    setClientName("");
    setNationalId("");
    setRegistration("");
    setPhone("");
    setCity("");
    setEmail("");
    setAddress("");
    setContactPerson("");
    setCompanyType("");
  }

  if (!open) return null;

  async function saveClient() {
    if (!clientName.trim()) {
      alert(tr("يرجى إدخال اسم العميل.", "Please enter the client name."));
      return;
    }

    /*
     * عند إنشاء عميل جديد:
     * يجب أن يكون هناك branch_id.
     *
     * مدير الفرع:
     * branchId يأتي من users.branch_id.
     *
     * Admin:
     * إذا لم يكن مرتبطًا بفرع، سيتم رفض الإضافة هنا.
     */
    if (!client && !branchId) {
      alert(
        tr("لا يمكن إضافة العميل لأن المستخدم الحالي غير مرتبط بفرع.", "Cannot add a client because your account is not assigned to a branch.")
      );
      return;
    }

    setSaving(true);

    try {
      let error;

      if (client) {
        /*
         * تعديل العميل
         *
         * لا نغير branch_id هنا.
         * العميل يبقى تابعًا لفرعه الأصلي.
         *
         * ولا نغير id.
         */
        const result = await supabase
          .from("clients")
          .update({
            client_name: clientName.trim(),
            national_id: nationalId.trim() || null,
            commercial_registration: registration.trim() || null,
            phone: phone.trim(),
            city: city.trim(),
            email: email.trim(),
            address: address.trim(),
            contact_person: contactPerson.trim(),
            company_type: companyType.trim(),
          })
          .eq("id", client.id);

        error = result.error;
      } else {
        /*
         * إنشاء عميل جديد
         *
         * مهم جداً:
         * لا نرسل id هنا.
         *
         * Supabase / PostgreSQL سيقوم
         * بتوليد رقم id تلقائياً.
         */
        const result = await supabase
          .from("clients")
          .insert([
            {
              client_name: clientName.trim(),
              national_id: nationalId.trim() || null,
            commercial_registration: registration.trim() || null,
            phone: phone.trim(),
              city: city.trim(),
              email: email.trim(),
              address: address.trim(),
              contact_person: contactPerson.trim(),
              company_type: companyType.trim(),
              status: "Active",
              branch_id: branchId,
            },
          ]);

        error = result.error;
      }

      if (error) {
        console.error("SAVE CLIENT ERROR:", error);

        alert(
          tr("حدث خطأ أثناء حفظ العميل:\n", "Could not save the client:\n") +
            error.message
        );

        return;
      }

      clearForm();

      onSaved();
      onClose();
    } catch (error: any) {
      console.error(
        "SAVE CLIENT EXCEPTION:",
        error
      );

      alert(
        tr("حدث خطأ أثناء حفظ العميل:\n", "Could not save the client:\n") +
          (error?.message || tr("خطأ غير معروف", "Unknown error"))
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-[600px] max-w-[95vw]">

        <h2 className="text-2xl font-bold mb-6">
          {client
            ? tr("تعديل بيانات العميل", "Edit Client")
            : tr("إضافة عميل جديد", "Add New Client")}
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder={tr("اسم العميل", "Client Name")}
            value={clientName}
            onChange={(e) =>
              setClientName(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder={tr("رقم الهوية", "National ID")}
            value={nationalId}
            onChange={(e) =>
              setNationalId(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder={tr("رقم السجل التجاري", "Commercial registration number")}
            value={registration}
            onChange={(e) =>
              setRegistration(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder={tr("الهاتف", "Phone")}
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder={tr("المدينة", "City")}
            value={city}
            onChange={(e) =>
              setCity(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder={tr("البريد الإلكتروني", "Email")}
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder={tr("مسؤول التواصل", "Contact Person")}
            value={contactPerson}
            onChange={(e) =>
              setContactPerson(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder={tr("نوع الشركة", "Company Type")}
            value={companyType}
            onChange={(e) =>
              setCompanyType(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black col-span-2"
            placeholder={tr("العنوان", "Address")}
            value={address}
            onChange={(e) =>
              setAddress(e.target.value)
            }
          />

        </div>

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
          >
            {tr("إلغاء", "Cancel")}
          </button>

          <button
            onClick={saveClient}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {saving
              ? tr("جارٍ الحفظ...", "Saving...")
              : client
              ? tr("حفظ التعديلات", "Update Client")
              : tr("حفظ العميل", "Save Client")}
          </button>

        </div>

      </div>
    </div>
  );
}
