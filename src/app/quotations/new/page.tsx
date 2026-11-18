"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import DraftForm from "../QuotationForm";

export default function NewQuotationPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "accountant", "branch_manager", "technical_manager"]}>
      <DraftForm />
    </ProtectedRoute>
  );
}