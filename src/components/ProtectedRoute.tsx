"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
  adminOnly?: boolean;
};

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/");
      return;
    }

    const user = JSON.parse(savedUser);

    if (adminOnly && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [router, adminOnly]);

  return <>{children}</>;
}
