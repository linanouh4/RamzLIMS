"use client";

import ProtectedRoute from "../components/ProtectedRoute";

export default function Employees() {
  return (
    <ProtectedRoute adminOnly={true}>
      <main className="min-h-screen bg-gray-100 p-8">

        <div className="bg-white rounded-xl shadow p-6">

          <h1 className="text-3xl font-bold text-blue-800">
            Employees
          </h1>

          <p className="text-gray-500 mt-3">
            Employee management
          </p>

        </div>

      </main>
    </ProtectedRoute>
  );
}