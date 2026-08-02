"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/samples");
  }, [router]);

  return <div className="p-8">Loading...</div>;
}