"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSavedUser } from "@/lib/auth";

export default function TasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = getSavedUser();

    if (!savedUser) {
      router.push("/");
      return;
    }

    setUser(savedUser);
  }, [router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        جاري التحميل...
      </div>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Tasks</h1>

      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-gray-600">
          صفحة المهام الرئيسية
        </p>

        <button
          onClick={() => router.push("/technician/tasks")}
          className="mt-6 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700"
        >
          فتح مهام الفنيين
        </button>
      </div>
    </main>
  );
}