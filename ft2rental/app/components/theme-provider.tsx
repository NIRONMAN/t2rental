"use client";

import { useEffect, useMemo, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "t2rental.theme";

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  return preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") {
      return "system";
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
    return "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const resolved = resolveTheme(preference);
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    window.localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (preference !== "system") {
        return;
      }

      const root = document.documentElement;
      const resolved = media.matches ? "dark" : "light";
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const nextThemeLabel = useMemo(() => {
    if (preference === "light") {
      return "Dark";
    }
    if (preference === "dark") {
      return "System";
    }
    return "Light";
  }, [preference]);

  function rotateTheme() {
    setPreference((current) => {
      if (current === "light") {
        return "dark";
      }
      if (current === "dark") {
        return "system";
      }
      return "light";
    });
  }

  return (
    <>
      {children}
      <button
        type="button"
        onClick={rotateTheme}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-stone-300 bg-white/90 px-4 py-2 text-xs font-semibold text-stone-800 shadow-sm backdrop-blur hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-100 dark:hover:bg-stone-800"
        aria-label={`Change theme. Current: ${preference}. Next: ${nextThemeLabel}.`}
      >
        Theme: {preference} (next: {nextThemeLabel})
      </button>
    </>
  );
}
