"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearSavedUser, saveUser } from "@/lib/auth";

type Props = {
  children: ReactNode;
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
  const [message, setMessage] = useState("");
  // A stable dependency even when callers pass an inline array.
  const rolesKey = JSON.stringify(
    (allowedRoles || []).map((role) => role.trim().toLowerCase())
  );

  useEffect(() => {
    let active = true;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setMessage("");

    async function verifyAccess() {
      const run = ++generation;
      const isCurrent = () => active && run === generation;
      setLoading(true);
      setMessage("");
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!isCurrent()) return;
        if (error) {
          clearSavedUser();
          setMessage("تعذر التحقق من جلسة الدخول. أعيدي المحاولة أو سجّلي الدخول مجددًا.");
          return;
        }
        if (!data.user) {
          clearSavedUser();
          router.replace("/");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, username, full_name, role, branch_id, signature, auth_user_id")
          .eq("auth_user_id", data.user.id)
          .single();

        if (!isCurrent()) return;
        if (profileError || !profile || profile.auth_user_id !== data.user.id) {
          clearSavedUser();
          setMessage("تعذر تحميل حساب الموظف المرتبط بجلسة الدخول. راجعي مسؤول النظام للتحقق من الربط وصلاحية قراءة الحساب.");
          return;
        }

        const role = String(profile.role || "").trim().toLowerCase();
        if (!role) {
          clearSavedUser();
          setMessage("لم يُحدّد دور لهذا الحساب. راجعي مسؤول النظام.");
          return;
        }

        saveUser({
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name || profile.username,
          role,
          branch_id: profile.branch_id == null ? null : Number(profile.branch_id),
          signature: profile.signature || null,
          auth_user_id: data.user.id,
        });

        const roles = JSON.parse(rolesKey) as string[];
        if ((adminOnly && role !== "admin") || (roles.length > 0 && !roles.includes(role))) {
          setMessage("ليس لديكِ صلاحية لفتح هذه الصفحة.");
          return;
        }
        setLoading(false);
      } catch {
        if (!isCurrent()) return;
        clearSavedUser();
        setMessage("تعذر التحقق من صلاحية الدخول. تحققي من الاتصال وأعيدي المحاولة.");
      }
    }

    function scheduleVerification() {
      if (!active) return;
      // Do not run Supabase requests inside the auth event callback.
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => { void verifyAccess(); }, 0);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        if (event === "SIGNED_OUT") {
          ++generation;
          if (timer !== undefined) clearTimeout(timer);
          clearSavedUser();
          setLoading(true);
          setMessage("");
          router.replace("/");
          return;
        }
        if (session) scheduleVerification();
      }
    );

    void verifyAccess();
    window.addEventListener("focus", scheduleVerification);
    return () => {
      active = false;
      ++generation;
      if (timer !== undefined) clearTimeout(timer);
      subscription.unsubscribe();
      window.removeEventListener("focus", scheduleVerification);
    };
  }, [router, adminOnly, rolesKey]);

  if (message) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p role="alert">{message}</p>
        <button onClick={() => window.location.reload()} className="rounded-lg bg-blue-700 px-4 py-2 text-white">
          إعادة المحاولة
        </button>
        <button onClick={async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            setMessage("تعذر إنهاء الجلسة. تحققي من الاتصال وأعيدي المحاولة.");
            return;
          }
          clearSavedUser();
          router.replace("/");
        }} className="rounded-lg border px-4 py-2">
          تسجيل الخروج
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        جارٍ التحقق من صلاحية الدخول...
      </div>
    );
  }
  return <>{children}</>;
}
