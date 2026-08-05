"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function TechnicianPage() {
  return (
    <ProtectedRoute>
      <div className="p-6">
        <h1 className="text-3xl font-bold">
          👷 Technician Dashboard
        </h1>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold">
              Assigned Tasks
            </h2>
            <p className="text-gray-500 mt-2">
              No tasks yet
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold">
              Site Visits
            </h2>
            <p className="text-gray-500 mt-2">
              No visits yet
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold">
              Field Results
            </h2>
            <p className="text-gray-500 mt-2">
              No results yet
            </p>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}