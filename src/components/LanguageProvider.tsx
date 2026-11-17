"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Language = "ar" | "en";
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyLanguage(language: Language) {
  document.documentElement.lang = language;
  document.title = language === "ar" ? "شركة رمز الأمارات لفحص التربة والخرسانة" : "Ramz Alemarat for Soil and Concrete Testing Company";
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showLanguageControl = pathname === "/" || /^\/(contract-approval|customer-approval|verify)\//.test(pathname || "");
  const [language, setLanguageState] = useState<Language>("ar");
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    function loadGuestPreference() {
      const selected = localStorage.getItem("ramz-language-guest") === "en" ? "en" : "ar";
      setAuthUserId(null);
      setLanguageState(selected);
      applyLanguage(selected);
    }

    async function loadPreference(userId: string) {
      setAuthUserId(userId);
      const localChoice = localStorage.getItem(`ramz-language-${userId}`);
      if (localChoice === "ar" || localChoice === "en") {
        setLanguageState(localChoice);
        applyLanguage(localChoice);
      }

      const { data } = await supabase
        .from("user_preferences")
        .select("preferred_language")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (!active) return;
      const selected: Language = data?.preferred_language === "en" ? "en" : "ar";
      setLanguageState(selected);
      applyLanguage(selected);
      localStorage.setItem(`ramz-language-${userId}`, selected);
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user?.id) void loadPreference(data.user.id);
      else loadGuestPreference();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!active) return;
        if (session?.user.id) void loadPreference(session.user.id);
        else loadGuestPreference();
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const setLanguage = useCallback(async (selected: Language) => {
    setLanguageState(selected);
    applyLanguage(selected);
    if (!authUserId) {
      localStorage.setItem("ramz-language-guest", selected);
      return;
    }

    localStorage.setItem(`ramz-language-${authUserId}`, selected);
    const { error } = await supabase.from("user_preferences").upsert(
      {
        auth_user_id: authUserId,
        preferred_language: selected,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id" }
    );
    if (error) console.error("Could not save language preference:", error);
  }, [authUserId]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {showLanguageControl && (
        <div className="flex justify-end bg-slate-100 px-4 py-2 print:hidden">
          <button type="button" lang={language === "ar" ? "en" : "ar"}
            className="rounded border bg-white px-3 py-1 text-sm text-blue-800"
            onClick={() => void setLanguage(language === "ar" ? "en" : "ar")}>
            {language === "ar" ? "English" : "العربية"}
          </button>
        </div>
      )}
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}