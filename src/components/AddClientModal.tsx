"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Client = {
  id?: number;
  client_name: string;
  phone: string;
  city: string;
  email: string;
  address: string;
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
  const [clientName, setClientName] =
    useState("");
const [clientId, setClientId] =
  useState("");
  const [phone, setPhone] =
    useState("");

  const [city, setCity] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [contactPerson, setContactPerson] =
    useState("");

  const [companyType, setCompanyType] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    if (client) {
      setClientId(
  client.id ? String(client.id) : ""
);
      setClientName(
        client.client_name || ""
      );

      setPhone(client.phone || "");

      setCity(client.city || "");

      setEmail(client.email || "");

      setAddress(client.address || "");

      setContactPerson(
        client.contact_person || ""
      );

      setCompanyType(
        client.company_type || ""
      );
    } else {
      clearForm();
      
    }
    
  }, [client, open]);

  function clearForm() {
    setClientId("");
    setClientName("");
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
      alert("Please enter the client name.");
      return;
    }
if (!client && !clientId.trim()) {
  alert("Please enter the Client ID.");
  return;
}

const manualClientId = Number(clientId);

if (
  !client &&
  (!Number.isInteger(manualClientId) ||
    manualClientId <= 0)
) {
  alert("Client ID must be a positive number.");
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
     * إذا لم يكن مرتبطًا بفرع، سيبقى branch_id = null.
     */
    if (!client && !branchId) {
      alert(
        "لا يمكن إضافة العميل لأن المستخدم الحالي غير مرتبط بفرع."
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
         */
        const result = await supabase
          .from("clients")
          .update({
            client_name: clientName,
            phone,
            city,
            email,
            address,
            contact_person:
              contactPerson,
            company_type:
              companyType,
          })
          .eq("id", client.id);

        error = result.error;
      } else {
        /*
         * إنشاء عميل جديد
         *
         * ربط العميل تلقائيًا بفرع
         * المستخدم الحالي.
         */
        const result = await supabase
  .from("clients")
  .insert([
    {
      id: manualClientId,
      client_name: clientName,
      phone,
      city,
      email,
      address,
      contact_person:
        contactPerson,
      company_type:
        companyType,
      status: "Active",
      branch_id: branchId,
    },
  ]);
        error = result.error;
      }

      if (error) {
        console.error(
          "SAVE CLIENT ERROR:",
          error
        );

        alert(
          "حدث خطأ أثناء حفظ العميل:\n" +
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
        "حدث خطأ أثناء حفظ العميل:\n" +
          (error?.message || "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-[600px] max-w-[95vw]">

        <h2 className="text-2xl font-bold mb-6">
          {client
            ? "Edit Client"
            : "Add New Client"}
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            
            placeholder="Client Name"
            value={clientName}
            onChange={(e) =>
              setClientName(e.target.value)
            }
          />
{!client && (
  <input
    type="number"
    min="1"
    className="border border-gray-300 rounded-lg p-3 text-black"
    placeholder="Client ID"
    value={clientId}
    onChange={(e) =>
      setClientId(e.target.value)
    }
  />
)}
          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder="Phone"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder="City"
            value={city}
            onChange={(e) =>
              setCity(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder="Contact Person"
            value={contactPerson}
            onChange={(e) =>
              setContactPerson(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black"
            placeholder="Company Type"
            value={companyType}
            onChange={(e) =>
              setCompanyType(e.target.value)
            }
          />

          <input
            className="border border-gray-300 rounded-lg p-3 text-black col-span-2"
            placeholder="Address"
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
            Cancel
          </button>

          <button
            onClick={saveClient}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : client
              ? "Update Client"
              : "Save Client"}
          </button>

        </div>

      </div>

    </div>
  );
}