"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  user?: {
    role?: string;
    full_name?: string;
  };
};

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `block rounded-lg p-3 transition ${
      pathname === href
        ? "bg-blue-600 font-semibold shadow"
        : "hover:bg-blue-700"
    }`;

  return (
    <aside className="w-64 bg-blue-800 text-white p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-10">
        RamzLIMS
      </h1>

      {user && (
        <div className="mb-6 p-4 rounded-xl bg-blue-700">
          <div className="text-sm text-slate-100">Logged in as</div>
          <div className="font-semibold text-lg">{user.full_name}</div>
          <div className="text-sm text-slate-200 capitalize">{user.role}</div>
        </div>
      )}

      <nav className="space-y-4">

        <Link
          href="/dashboard"
          className={linkClass("/dashboard")}
        >
          🏠 Dashboard
        </Link>

  {user?.role === "admin" && (
  <>
    <Link
      href="/clients"
      className={linkClass("/clients")}
    >
      👥 Clients
    </Link>

    <Link
      href="/projects"
      className={linkClass("/projects")}
    >
      🏗 Projects
    </Link>
<Link
  href="/task-results"
  className={linkClass("/task-results")}
>
  📋 Task Results
</Link>
    <Link
      href="/samples"
      className={linkClass("/samples")}
    >
      🧪 Samples
    </Link>

    <Link
      href="/tests"
      className={linkClass("/tests")}
    >
      🔬 Tests
    </Link>

    <Link
      href="/reports"
      className={linkClass("/reports")}
    >
      📑 Reports
    </Link>
  </>
)}
{user?.role === "technician" && (
  <Link
    href="/technician"
    className={linkClass("/technician")}
  >
    👷 Technician
  </Link>
)}
      </nav>
    </aside>
  );
}
