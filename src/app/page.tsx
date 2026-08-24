"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSavedUser, saveUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = getSavedUser();

    if (savedUser) {
      if (savedUser.role === "technician") {
        router.replace("/technician");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [router]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      alert("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, username, full_name, role, branch_id, signature"
        )
        .eq("username", username.trim())
        .eq("password", password.trim())
        .maybeSingle();

      if (error) {
        console.error("LOGIN ERROR:", error);
        alert("تعذر الوصول إلى بيانات المستخدم.");
        return;
      }

      if (!data) {
        alert("اسم المستخدم أو كلمة المرور غير صحيحة");
        return;
      }

      const user = {
        id: data.id,
        username: data.username,
        full_name: data.full_name || data.username,
        role: String(data.role || "reception")
          .trim()
          .toLowerCase(),
        branch_id:
          data.branch_id !== null &&
          data.branch_id !== undefined
            ? Number(data.branch_id)
            : null,
        signature: data.signature || null,
      };

      saveUser(user);

      console.log("LOGGED IN USER:", user);

      if (user.role === "technician") {
        router.replace("/technician");
      } else {
        router.replace("/dashboard");
      }
    } catch (error: any) {
      console.error("LOGIN ERROR:", error);
      alert(error?.message || "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-[400px]">
        <h1 className="text-4xl font-bold text-center text-blue-700">
          RamzLIMS
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Laboratory Information Management System
        </p>

        <div className="mt-8">
          <label className="block mb-2 font-semibold">
            Username
          </label>

          <input
            type="text"
            placeholder="Enter Username"
            className="w-full border rounded-lg p-3 mb-4"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />

          <label className="block mb-2 font-semibold">
            Password
          </label>

          <input
            type="password"
            placeholder="Enter Password"
            className="w-full border rounded-lg p-3 mb-6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white rounded-lg p-3"
          >
            {loading ? "جاري تسجيل الدخول..." : "Login"}
          </button>
        </div>
      </div>
    </main>
  );
}
