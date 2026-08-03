"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSavedUser, isAllowedRole, isAdmin } from "@/lib/auth";

type Props = {
  children: React.ReactNode;
  adminOnly?: boolean;
  allowedRoles?: string[];
};

export default function ProtectedRoute({
  children,
  adminOnly = false,
  allowedRoles,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getSavedUser();

    if (!user) {
      router.push("/");
      return;
    }

    if (adminOnly && !isAdmin(user)) {
      router.push("/dashboard");
      return;
    }

    if (!isAllowedRole(user, allowedRoles)) {
      router.push("/dashboard");
      return;
    }

    setLoading(false);
  }, [router, adminOnly, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
