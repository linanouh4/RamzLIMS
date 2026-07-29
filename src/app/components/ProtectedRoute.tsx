"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/");
      return;
    }

    const user = JSON.parse(savedUser);

    if (adminOnly && user.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setLoading(false);
  }, [router, adminOnly]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }


  return <>{children}</>;
}