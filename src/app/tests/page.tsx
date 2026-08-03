"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function TestsPage() {
  return (
    <ProtectedRoute>
      <div className="p-8">
        <h1 className="text-3xl font-bold">
          Tests Page
        </h1>
      </div>
    </ProtectedRoute>
  );
}
