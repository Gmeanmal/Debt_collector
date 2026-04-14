import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/api/client";

export type ThemePref = "system" | "dark" | "light";

const STORAGE_KEY = "theme";

function readStoredPref(): ThemePref {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "dark" || raw === "light" || raw === "system") return raw;
  return "system";
}

function applyTheme(pref: ThemePref): void {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const effective: "light" | "dark" = pref === "system" ? (mql.matches ? "dark" : "light") : pref;
  if (effective === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(readStoredPref);

  useEffect(() => {
    applyTheme(pref);
    localStorage.setItem(STORAGE_KEY, pref);
    if (pref !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [pref]);

  const setPref = useCallback(async (next: ThemePref): Promise<void> => {
    setPrefState(next);
    try {
      await apiClient.PATCH("/me/preferences", { body: { theme_preference: next } });
    } catch {
      // Persisting preference server-side is best-effort; local state is the source of truth for UI.
    }
  }, []);

  const setPrefLocal = useCallback((next: ThemePref): void => {
    setPrefState(next);
  }, []);

  return { pref, setPref, setPrefLocal };
}
