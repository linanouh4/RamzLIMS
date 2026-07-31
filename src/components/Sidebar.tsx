"use client";

import Link from "next/link";

type Props = {
  user?: {
    role?: string;
    full_name?: string;
  };
};

export default function Sidebar({ user }: Props) {
  return (
    <aside className="w-64 bg-blue-800 text-white p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-10">
        RamzLIMS
      </h1>

      <nav className="space-y-4">
        <Link
          href="/dashboard"
          className="block hover:bg-blue-700 p-3 rounded-lg"
        >
          🏠 Dashboard
        </Link>

        <Link
          href="/samples"
          className="block hover:bg-blue-700 p-3 rounded-lg"
        >
          🧪 Samples
        </Link>

        <Link
          href="/tests"
          className="block hover:bg-blue-700 p-3 rounded-lg"
        >
          🔬 Tests
        </Link>

        <Link
          href="/clients"
          className="block hover:bg-blue-700 p-3 rounded-lg"
        >
          👥 Clients
        </Link>

        <Link
          href="/reports"
          className="block hover:bg-blue-700 p-3 rounded-lg"
        >
          📑 Reports
        </Link>

        {user?.role === "admin" && (
          <>
            <Link
              href="/employees"
              className="block hover:bg-blue-700 p-3 rounded-lg"
            >
              👨‍🔬 Employees
            </Link>

            <Link
              href="/settings"
              className="block hover:bg-blue-700 p-3 rounded-lg"
            >
              ⚙️ Settings
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
