"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSavedUser } from "@/lib/auth";

type Props = {
  user?: {
    id?: number | string;
    role?: string;
    full_name?: string;
  } | null;
};

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const role = user?.role?.toLowerCase();

  const logout = () => {
    clearSavedUser();
    router.push("/");
  };

  const linkClass = (href: string) =>
    `block rounded-lg p-3 transition ${
      pathname === href
        ? "bg-blue-600 font-semibold shadow"
        : "hover:bg-blue-700"
    }`;

  return (
    <aside className="w-64 bg-blue-800 text-white p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-10">RamzLIMS</h1>

      {user && (
        <div className="mb-6 p-4 rounded-xl bg-blue-700">
          <div className="text-sm text-slate-100">Logged in as</div>
          <div className="font-semibold text-lg">
            {user.full_name || "User"}
          </div>
          <div className="text-sm text-slate-200 capitalize">
            {role || "-"}
          </div>
        </div>
      )}

      <nav className="space-y-4">
        {role === "admin" && (
          <>
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              🏠 Dashboard
            </Link>

            <Link href="/employees" className={linkClass("/employees")}>
              👤 Users / Employees
            </Link>

            <Link href="/clients" className={linkClass("/clients")}>
              👥 All Clients
            </Link>

            <Link href="/projects" className={linkClass("/projects")}>
              🏗 All Projects
            </Link>

            <Link href="/task-results" className={linkClass("/task-results")}>
              📊 Task Results
            </Link>

            <Link href="/samples" className={linkClass("/samples")}>
              🧪 Samples
            </Link>

            <Link href="/tests" className={linkClass("/tests")}>
              🔬 Tests
            </Link>

            <Link href="/reports" className={linkClass("/reports")}>
              📑 Reports
            </Link>

            <Link href="/contracts" className={linkClass("/contracts")}>
              📝 Contracts
            </Link>
          </>
        )}

        {role === "accountant" && (
          <>
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              🏠 Dashboard
            </Link>

            <Link href="/clients" className={linkClass("/clients")}>
              👥 All Clients
            </Link>

            <Link href="/projects" className={linkClass("/projects")}>
              🏗 All Projects
            </Link>

            <Link href="/contracts" className={linkClass("/contracts")}>
              📝 Contracts
            </Link>

            <Link href="/reports" className={linkClass("/reports")}>
              📑 Reports
            </Link>
          </>
        )}

        {role === "branch_manager" && (
          <>
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              🏠 Dashboard
            </Link>

            <Link href="/clients" className={linkClass("/clients")}>
              👥 عملاء الفرع
            </Link>

            <Link href="/projects" className={linkClass("/projects")}>
              🏗 مشاريع الفرع
            </Link>

            <Link href="/contracts" className={linkClass("/contracts")}>
              📝 عقود العملاء
            </Link>

            <Link href="/task-results" className={linkClass("/task-results")}>
              📊 نتائج المهام
            </Link>

            <Link href="/reports" className={linkClass("/reports")}>
              📑 تقارير الفرع
            </Link>
          </>
        )}

        {role === "lab_manager" && (
          <>
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              🏠 Dashboard
            </Link>

            <Link href="/projects" className={linkClass("/projects")}>
              🏗 Projects
            </Link>

            <Link href="/task-results" className={linkClass("/task-results")}>
              📊 Task Results
            </Link>

            <Link href="/samples" className={linkClass("/samples")}>
              🧪 Samples
            </Link>

            <Link href="/tests" className={linkClass("/tests")}>
              🔬 Tests
            </Link>

            <Link href="/reports" className={linkClass("/reports")}>
              📑 Reports
            </Link>
          </>
        )}

        {role === "reception" && (
          <>
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              🏠 Dashboard
            </Link>

            <Link href="/clients" className={linkClass("/clients")}>
              👥 Clients
            </Link>

            <Link href="/projects" className={linkClass("/projects")}>
              🏗 Projects
            </Link>

            <Link href="/contracts" className={linkClass("/contracts")}>
              📝 Contracts
            </Link>
          </>
        )}

        {role === "technician" && (
          <>
            <Link href="/technician" className={linkClass("/technician")}>
              🏠 Dashboard
            </Link>

            <Link
              href="/technician/tasks"
              className={linkClass("/technician/tasks")}
            >
              🛠️ My Tasks
            </Link>

            <Link
              href="/technician/tests"
              className={linkClass("/technician/tests")}
            >
              🔬 My Tests
            </Link>

            <Link href="/task-results" className={linkClass("/task-results")}>
              📋 My Results
            </Link>
          </>
        )}

        <button
          onClick={logout}
          className="w-full text-right rounded-lg p-3 mt-8 bg-red-600 hover:bg-red-700 transition"
        >
          🚪 Logout
        </button>
      </nav>
    </aside>
  );
}