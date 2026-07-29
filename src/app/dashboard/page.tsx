"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/");
      return;
    }

    setUser(JSON.parse(savedUser));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <aside className="w-64 bg-blue-800 text-white p-6">

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


          {/* يظهر للـ Admin فقط */}
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


      {/* Content */}
      <section className="flex-1 p-8">


        <div className="flex justify-between items-center mb-8">

          <div>

            <h2 className="text-3xl font-bold">
              Dashboard
            </h2>


            {user && (
              <p className="text-gray-500 mt-2">
                Welcome {user.full_name} | Role: {user.role}
              </p>
            )}

          </div>


          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg"
          >
            Logout
          </button>


        </div>



        <div className="grid grid-cols-4 gap-6">


          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-gray-500">
              Samples
            </h3>

            <p className="text-4xl font-bold mt-3">
              152
            </p>
          </div>



          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-gray-500">
              Today's Tests
            </h3>

            <p className="text-4xl font-bold mt-3">
              18
            </p>
          </div>



          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-gray-500">
              Completed Reports
            </h3>

            <p className="text-4xl font-bold mt-3">
              11
            </p>
          </div>



          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-gray-500">
              Clients
            </h3>

            <p className="text-4xl font-bold mt-3">
              34
            </p>
          </div>


        </div>


      </section>


    </main>
  );
}