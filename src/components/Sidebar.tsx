"use client";

import { useUiText } from "@/lib/uiText";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSavedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
user?: {
id?: number | string;
role?: string;
full_name?: string;
} | null;
};

export default function Sidebar({ user }: Props) {
  const ui = useUiText();
const pathname = usePathname();
const router = useRouter();
const [loggingOut, setLoggingOut] = useState(false);
const [logoutError, setLogoutError] = useState("");

const { language, setLanguage } = useLanguage();
const role = user?.role?.toLowerCase();

const logout = async () => {
if (loggingOut) return;
setLoggingOut(true);
setLogoutError("");
try {
const { error } = await supabase.auth.signOut({ scope: "local" });
if (error) throw error;
clearSavedUser();
router.replace("/");
} catch {
setLogoutError("تعذر تسجيل الخروج. تحققي من الاتصال وأعيدي المحاولة.");
setLoggingOut(false);
}
};

const linkClass = (href: string) => "block rounded-lg p-3 transition " + (pathname === href ? "bg-blue-600 font-semibold shadow" : "hover:bg-blue-700");

return (
<aside className="w-64 bg-blue-800 text-white p-6 min-h-screen">
<h1 className="text-3xl font-bold mb-10">RamzLIMS</h1>

  {user && (
    <div className="mb-6 p-4 rounded-xl bg-blue-700">
      <div className="text-sm text-slate-100">{ui("Logged in as")}</div>
      <div className="font-semibold text-lg">
        {user.full_name || ui("User")}
      </div>
      <div className="text-sm text-slate-200 capitalize">
        {ui(role || "-")}
      </div>
    </div>
  )}

  <nav className="space-y-4">
    {role === "admin" && (
      <>
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          🏠 {language === "ar" ? "لوحة التحكم" : "Dashboard"}
        </Link>
        <Link href="/employees" className={linkClass("/employees")}>
          👤 {language === "ar" ? "المستخدمون والموظفون" : "Users / Employees"}
        </Link>
        <Link href="/clients" className={linkClass("/clients")}>
          👥 {language === "ar" ? "كل العملاء" : "All Clients"}
        </Link>
        <Link href="/projects" className={linkClass("/projects")}>
          🏗 {language === "ar" ? "كل المشاريع" : "All Projects"}
        </Link>
        <Link href="/task-results" className={linkClass("/task-results")}>
          📊 {language === "ar" ? "نتائج المهام" : "Task Results"}
        </Link>
        <Link href="/samples" className={linkClass("/samples")}>
          🧪 {language === "ar" ? "العينات" : "Samples"}
        </Link>
        <Link href="/tests" className={linkClass("/tests")}>
          🔬 {language === "ar" ? "الفحوصات" : "Tests"}
        </Link>
        <Link href="/reports" className={linkClass("/reports")}>
          📑 {language === "ar" ? "التقارير" : "Reports"}
        </Link>
        <Link href="/contracts" className={linkClass("/contracts")}>
          📝 {language === "ar" ? "العقود" : "Contracts"}
        </Link>
      </>
    )}

    {role === "accountant" && (
      <>
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          🏠 {language === "ar" ? "لوحة التحكم" : "Dashboard"}
        </Link>
        <Link href="/clients" className={linkClass("/clients")}>
          👥 {language === "ar" ? "كل العملاء" : "All Clients"}
        </Link>
        <Link href="/projects" className={linkClass("/projects")}>
          🏗 {language === "ar" ? "كل المشاريع" : "All Projects"}
        </Link>
        <Link href="/contracts" className={linkClass("/contracts")}>
          📝 {language === "ar" ? "العقود" : "Contracts"}
        </Link>
        <Link href="/reports" className={linkClass("/reports")}>
          📑 {language === "ar" ? "التقارير" : "Reports"}
        </Link>
      </>
    )}

    {role === "branch_manager" && (
      <>
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          🏠 {language === "ar" ? "لوحة التحكم" : "Dashboard"}
        </Link>
        <Link href="/clients" className={linkClass("/clients")}>
          👥 {language === "ar" ? "عملاء الفرع" : "Branch Clients"}
        </Link>
        <Link href="/projects" className={linkClass("/projects")}>
          🏗 {language === "ar" ? "مشاريع الفرع" : "Branch Projects"}
        </Link>
        <Link href="/samples" className={linkClass("/samples")}>
          🧪 {language === "ar" ? "العينات" : "Samples"}
        </Link>
        <Link href="/tests" className={linkClass("/tests")}>
          🔬 {language === "ar" ? "الفحوصات" : "Tests"}
        </Link>
        <Link href="/contracts" className={linkClass("/contracts")}>
          📝 {language === "ar" ? "عقود العملاء" : "Customer Contracts"}
        </Link>
        <Link href="/task-results" className={linkClass("/task-results")}>
          📊 {language === "ar" ? "نتائج المهام" : "Task Results"}
        </Link>
        <Link href="/reports" className={linkClass("/reports")}>
          📑 {language === "ar" ? "تقارير الفرع" : "Branch Reports"}
        </Link>
      </>
    )}

    {(role === "technical_manager" || role === "quality_manager" || role === "lab_manager") && (
          <Link href="/contracts" className={linkClass("/contracts")}>
            {ui("📝 العقود")}
          </Link>
        )}

        {role === "technical_manager" && (
      <>
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          {ui("🏠 لوحة التحكم")}
        </Link>
        <Link href="/samples" className={linkClass("/samples")}>
          🧪 {language === "ar" ? "إدارة العينات" : "Manage Samples"}
        </Link>
        <Link href="/clients" className={linkClass("/clients")}>
          👥 {language === "ar" ? "إدارة العملاء" : "Manage Clients"}
        </Link>
        <Link href="/projects" className={linkClass("/projects")}>
          📁 {language === "ar" ? "المشاريع وطلبات الفحص" : "Projects & Test Requests"}
        </Link>
        <Link href="/tests" className={linkClass("/tests")}>
          🔬 {language === "ar" ? "إدارة الفحوصات" : "Manage Tests"}
        </Link>
        <Link href="/task-results" className={linkClass("/task-results")}>
          📊 {language === "ar" ? "نتائج المهام" : "Task Results"}
        </Link>
      </>
    )}

    {role === "lab_manager" && (
      <>
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          🏠 {language === "ar" ? "لوحة التحكم" : "Dashboard"}
        </Link>
        <Link href="/projects" className={linkClass("/projects")}>
          {ui("🏗 Projects")}
        </Link>
        <Link href="/task-results" className={linkClass("/task-results")}>
          📊 {language === "ar" ? "نتائج المهام" : "Task Results"}
        </Link>
        <Link href="/samples" className={linkClass("/samples")}>
          🧪 {language === "ar" ? "العينات" : "Samples"}
        </Link>
        <Link href="/tests" className={linkClass("/tests")}>
          🔬 {language === "ar" ? "الفحوصات" : "Tests"}
        </Link>
        <Link href="/reports" className={linkClass("/reports")}>
          📑 {language === "ar" ? "التقارير" : "Reports"}
        </Link>
      </>
    )}

    {role === "reception" && (
      <>
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          🏠 {language === "ar" ? "لوحة التحكم" : "Dashboard"}
        </Link>
        <Link href="/clients" className={linkClass("/clients")}>
          {ui("👥 Clients")}
        </Link>
        <Link href="/projects" className={linkClass("/projects")}>
          {ui("🏗 Projects")}
        </Link>
        <Link href="/contracts" className={linkClass("/contracts")}>
          📝 {language === "ar" ? "العقود" : "Contracts"}
        </Link>
      </>
    )}

    {role === "technician" && (
      <>
        <Link href="/technician" className={linkClass("/technician")}>
          🏠 {language === "ar" ? "لوحة التحكم" : "Dashboard"}
        </Link>
        <Link href="/technician/tasks" className={linkClass("/technician/tasks")}>
          🛠️ {language === "ar" ? "مهامي" : "My Tasks"}
        </Link>
        <Link href="/technician/tests" className={linkClass("/technician/tests")}>
          🔬 {language === "ar" ? "فحوصاتي" : "My Tests"}
        </Link>
        <Link href="/task-results" className={linkClass("/task-results")}>
          📋 {language === "ar" ? "نتائجي" : "My Results"}
        </Link>
      </>
    )}

    {(role === "accountant" ||
      role === "technical_manager" ||
      (role === "admin" && Number(user?.id) === 1)) && (
      <Link href="/quotations" className={linkClass("/quotations")}>
        {language === "ar" ? "عروض الأسعار" : "Quotations"}
      </Link>
    )}

    <button
      type="button"
      onClick={() => void setLanguage(language === "ar" ? "en" : "ar")}
      className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm hover:bg-blue-700"
    >
      {language === "ar" ? "English" : "العربية"}
    </button>
    {logoutError && (
      <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800">
        {ui(logoutError)}
      </p>
    )}
    <button
      type="button"
      onClick={logout}
      disabled={loggingOut}
      className="w-full text-end rounded-lg p-3 mt-8 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
    >
      {loggingOut ? (language === "ar" ? "جارٍ تسجيل الخروج..." : "Signing out...") : (language === "ar" ? "🚪 تسجيل الخروج" : "🚪 Logout")}
    </button>
  </nav>
</aside>

);
}