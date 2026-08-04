"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const STORAGE_KEY = "ramzlims-company-profile";

type CompanyProfile = {
  companyName: string;
  companyAddress: string;
  logoData: string;
  signatureData: string;
};

export default function Settings() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("شركة رمز الإمارات لفحص التربة والخرسانة");
  const [companyAddress, setCompanyAddress] = useState("RAMZ Emirates Laboratory for Soil & Concrete Testing");
  const [logoData, setLogoData] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY);
      if (!savedProfile) return;

      const parsed: CompanyProfile = JSON.parse(savedProfile);
      setCompanyName(parsed.companyName || "شركة رمز الإمارات لفحص التربة والخرسانة");
      setCompanyAddress(parsed.companyAddress || "RAMZ Emirates Laboratory for Soil & Concrete Testing");
      setLogoData(parsed.logoData || "");
      setSignatureData(parsed.signatureData || "");
    } catch {
      // Ignore invalid stored profile
    }
  }, []);

  function readFileAsDataUrl(file: File | null, setter: (value: string) => void) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    const profile: CompanyProfile = {
      companyName: companyName.trim() || "شركة رمز الإمارات لفحص التربة والخرسانة",
      companyAddress: companyAddress.trim() || "RAMZ Emirates Laboratory for Soil & Concrete Testing",
      logoData,
      signatureData,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <ProtectedRoute adminOnly={true}>
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    router.back();
                  } else {
                    router.push("/dashboard");
                  }
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-blue-800">Settings</h1>
            </div>
            <p className="text-gray-500 mt-3">System settings and branding for reports.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Company Branding</h2>
              <p className="text-gray-600 text-sm mb-6">
                Add your company name, address, logo, and signature. These details will appear on reports.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="block text-sm font-medium mb-2">Company Name</span>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium mb-2">Company Address</span>
                  <input
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <label className="block">
                  <span className="block text-sm font-medium mb-2">Logo Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => readFileAsDataUrl(e.target.files?.[0] || null, setLogoData)}
                    className="w-full rounded-lg border border-dashed border-gray-300 p-3"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium mb-2">Signature Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => readFileAsDataUrl(e.target.files?.[0] || null, setSignatureData)}
                    className="w-full rounded-lg border border-dashed border-gray-300 p-3"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={saveProfile}
                  className="rounded-lg bg-blue-700 px-5 py-3 text-white hover:bg-blue-800"
                >
                  Save Branding
                </button>
                {saved && <span className="text-sm font-medium text-green-600">Saved successfully</span>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <div className="rounded-xl border border-gray-200 p-4">
                {logoData ? (
                  <img src={logoData} alt="Company logo preview" className="mx-auto mb-3 h-16 w-auto object-contain" />
                ) : (
                  <div className="mb-3 flex h-16 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
                    Logo preview
                  </div>
                )}
                <p className="text-center text-lg font-bold">{companyName}</p>
                <p className="text-center text-sm text-gray-600">{companyAddress}</p>
                {signatureData ? (
                  <img src={signatureData} alt="Signature preview" className="mx-auto mt-4 h-12 w-auto object-contain" />
                ) : (
                  <div className="mx-auto mt-4 h-12 w-32 border-b border-gray-400" />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
