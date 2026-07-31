"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username.trim())
      .eq("password", password.trim())
      .limit(1);

    console.log("LOGIN DATA:", data);
    console.log("LOGIN ERROR:", error);

    if (error) {
      alert(error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert("اسم المستخدم أو كلمة المرور غير صحيحة");
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify(data[0])
    );

    router.push("/dashboard");
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
          />

          <button
            onClick={handleLogin}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-lg p-3"
          >
            Login
          </button>
        </div>
      </div>
    </main>
  );
}
