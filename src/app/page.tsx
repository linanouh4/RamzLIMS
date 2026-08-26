
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
      // =====================================================
      // 1. البحث عن المستخدم بواسطة Username
      // =====================================================

      console.log("=================================");
      console.log("LOGIN START");
      console.log("USERNAME:", username.trim());
      console.log("=================================");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "id, username, email, full_name, role, branch_id, signature, auth_user_id"
        )
        .eq("username", username.trim())
        .maybeSingle();

      console.log("USER DATA:", userData);
      console.log("USER ERROR:", userError);

      // =====================================================
      // 2. تشخيص خطأ قراءة users
      // =====================================================

      if (userError) {
        console.error("USER LOOKUP ERROR:", userError);

        console.error(
          "ERROR MESSAGE:",
          String(userError.message)
        );

        console.error(
          "ERROR CODE:",
          String(userError.code)
        );

        console.error(
          "ERROR DETAILS:",
          String(userError.details)
        );

        console.error(
          "ERROR HINT:",
          String(userError.hint)
        );

        console.error(
          "ERROR STRING:",
          String(userError)
        );

        alert(
          "خطأ Supabase في قراءة المستخدم:\n\n" +
            "Message: " +
            String(userError.message) +
            "\n\n" +
            "Code: " +
            String(userError.code) +
            "\n\n" +
            "Details: " +
            String(userError.details) +
            "\n\n" +
            "Hint: " +
            String(userError.hint)
        );

        return;
      }

      // =====================================================
      // 3. المستخدم غير موجود
      // =====================================================

      if (!userData) {
        console.log(
          "NO USER FOUND FOR USERNAME:",
          username.trim()
        );

        alert("اسم المستخدم غير صحيح");
        return;
      }

      console.log("FOUND USER:", userData);

      // =====================================================
      // 4. التأكد من وجود Email
      // =====================================================

      if (!userData.email) {
        alert(
          "هذا المستخدم غير مرتبط ببريد إلكتروني.\n\n" +
            "يجب ربطه بحساب Supabase Authentication."
        );

        return;
      }

      console.log(
        "AUTH EMAIL:",
        userData.email
      );

      // =====================================================
      // 5. تسجيل الدخول عن طريق Supabase Auth
      // =====================================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password.trim(),
      });

      if (authError) {
        console.error("AUTH LOGIN ERROR:", authError);

        console.error(
          "AUTH ERROR MESSAGE:",
          String(authError.message)
        );

        console.error(
          "AUTH ERROR STATUS:",
          String(authError.status)
        );

        alert(
          "فشل تسجيل الدخول:\n\n" +
            String(authError.message)
        );

        return;
      }

      // =====================================================
      // 6. التأكد من وجود Auth User
      // =====================================================

      if (!authData.user) {
        console.error(
          "AUTH LOGIN SUCCESS BUT USER IS NULL"
        );

        alert("تعذر تسجيل الدخول.");
        return;
      }

      console.log(
        "AUTH LOGIN SUCCESS:",
        authData.user
      );

      console.log(
        "AUTH UID:",
        authData.user.id
      );

      // =====================================================
      // 7. التأكد من تطابق Auth User ID
      // =====================================================

      if (
        userData.auth_user_id &&
        userData.auth_user_id !== authData.user.id
      ) {
        console.error(
          "AUTH USER MISMATCH:",
          {
            databaseAuthId:
              userData.auth_user_id,

            loggedInAuthId:
              authData.user.id,
          }
        );

        await supabase.auth.signOut();

        alert(
          "حساب المستخدم غير مرتبط بحساب Authentication الصحيح."
        );

        return;
      }

      // =====================================================
      // 8. إنشاء بيانات المستخدم المحلية
      // =====================================================

      const user = {
        id: userData.id,

        username: userData.username,

        full_name:
          userData.full_name ||
          userData.username,

        role: String(
          userData.role || "reception"
        )
          .trim()
          .toLowerCase(),

        branch_id:
          userData.branch_id !== null &&
          userData.branch_id !== undefined
            ? Number(userData.branch_id)
            : null,

        signature:
          userData.signature || null,

        email:
          userData.email,

        auth_user_id:
          authData.user.id,
      };

      // =====================================================
      // 9. حفظ المستخدم
      // =====================================================

      saveUser(user);

      console.log("=================================");
      console.log("LOGIN SUCCESS");
      console.log("LOGGED IN USER:", user);
      console.log(
        "SUPABASE AUTH UID:",
        authData.user.id
      );
      console.log("=================================");

      // =====================================================
      // 10. التوجيه حسب الدور
      // =====================================================

      if (user.role === "technician") {
        router.replace("/technician");
      } else {
        router.replace("/dashboard");
      }
    } catch (error: any) {
      console.error(
        "LOGIN UNEXPECTED ERROR:",
        error
      );

      alert(
        error?.message ||
          "حدث خطأ غير متوقع أثناء تسجيل الدخول"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-[400px]">

        {/* ================================================= */}
        {/* Logo / Title */}
        {/* ================================================= */}

        <h1 className="text-4xl font-bold text-center text-blue-700">
          RamzLIMS
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Laboratory Information Management System
        </p>

        {/* ================================================= */}
        {/* Login Form */}
        {/* ================================================= */}

        <div className="mt-8">

          {/* Username */}

          <label className="block mb-2 font-semibold">
            Username
          </label>

          <input
            type="text"
            placeholder="Enter Username"
            className="w-full border rounded-lg p-3 mb-4"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            disabled={loading}
            autoComplete="username"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />

          {/* Password */}

          <label className="block mb-2 font-semibold">
            Password
          </label>

          <input
            type="password"
            placeholder="Enter Password"
            className="w-full border rounded-lg p-3 mb-6"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            disabled={loading}
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />

          {/* Login Button */}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white rounded-lg p-3 transition"
          >
            {loading
              ? "جاري تسجيل الدخول..."
              : "Login"}
          </button>

        </div>
      </div>
    </main>
  );
}

