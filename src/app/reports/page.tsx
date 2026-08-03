"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/samples");
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="p-8">Loading...</div>
    </ProtectedRoute>
  );
}