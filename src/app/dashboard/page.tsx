"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-100 flex">

        <Sidebar user={user} />

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
    </ProtectedRoute>
  );
}
