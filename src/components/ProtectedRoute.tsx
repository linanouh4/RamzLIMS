"use client";

import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = () => {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        router.push("/");
        return;
      }

      try {
        const user = JSON.parse(savedUser);

        if (adminOnly && user.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setLoading(false);
      } catch (error) {
        localStorage.removeItem("user");
        router.push("/");
      }
    };

    checkUser();
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
