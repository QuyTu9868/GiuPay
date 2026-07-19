/**
 * GiuPay — ThemeContext
 * Quản lý dark mode (CSS filter invert) + ngôn ngữ (vi/en).
 * Persist qua localStorage.
 *
 * Usage:
 *   const { isDark, lang, toggleDark, setLang, t } = useTheme();
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations } from "@/lib/i18n";

export type Lang = "vi" | "en";

// ── Context ──────────────────────────────────────────────────────────────────
interface ThemeCtx {
  isDark:     boolean;
  lang:       Lang;
  toggleDark: () => void;
  setLang:    (l: Lang) => void;
  t:          typeof translations[Lang];
}

const ThemeContext = createContext<ThemeCtx>({
  isDark:     false,
  lang:       "vi",
  toggleDark: () => {},
  setLang:    () => {},
  t:          translations.vi,
});

// ── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark,    setIsDark]    = useState(false);
  const [lang,      setLangState] = useState<Lang>("vi");

  // Read persisted prefs on mount (client only)
  useEffect(() => {
    const storedDark = localStorage.getItem("ap-dark") === "1";
    const storedLang = (localStorage.getItem("ap-lang") as Lang) ?? "vi";
    setIsDark(storedDark);
    setLangState(storedLang);
    if (storedDark) document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  function toggleDark() {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem("ap-dark", next ? "1" : "0");
      if (next) document.documentElement.setAttribute("data-theme", "dark");
      else      document.documentElement.removeAttribute("data-theme");
      return next;
    });
  }

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("ap-lang", l);
  }

  return (
    <ThemeContext.Provider value={{ isDark, lang, toggleDark, setLang, t: translations[lang] }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme() { return useContext(ThemeContext); }
