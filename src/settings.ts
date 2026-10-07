// Réglages de l'appareil (pas du projet) : langue de l'interface et apparence.
// Mémorisés dans le stockage local du navigateur ou de la fenêtre Tauri.

import { create } from "zustand";
import { detectLang, isLang, type Lang } from "./i18n/langs";
import { isTauri } from "./platform";

export type ThemePref = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const KEY = "cosmos:reglages";
const darkQuery = () => (typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined);

interface SettingsState {
  lang: Lang;
  themePref: ThemePref;
  /** Thème réellement affiché (« system » résolu). */
  theme: Theme;
  setLang: (lang: Lang) => void;
  setThemePref: (pref: ThemePref) => void;
}

function readSaved(): { lang?: unknown; themePref?: unknown } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

const resolve = (pref: ThemePref): Theme => (pref === "system" ? (darkQuery()?.matches ? "dark" : "light") : pref);

const saved = readSaved();
const initialLang: Lang = isLang(saved.lang) ? saved.lang : detectLang();
const initialPref: ThemePref =
  saved.themePref === "light" || saved.themePref === "dark" ? saved.themePref : "system";

export const useSettings = create<SettingsState>((set) => ({
  lang: initialLang,
  themePref: initialPref,
  theme: resolve(initialPref),
  setLang: (lang) => set({ lang }),
  setThemePref: (themePref) => set({ themePref, theme: resolve(themePref) }),
}));

/** Applique les réglages au document et les mémorise. À appeler une fois, avant le premier rendu. */
export function initSettings() {
  const apply = ({ lang, theme, themePref }: SettingsState) => {
    const root = document.documentElement;
    root.lang = lang;
    root.dataset.theme = theme;
    root.style.colorScheme = theme; // barres de défilement, listes déroulantes natives
    try {
      localStorage.setItem(KEY, JSON.stringify({ lang, themePref }));
    } catch {
      /* réglage non mémorisé, sans gravité */
    }
  };
  apply(useSettings.getState());
  useSettings.subscribe(apply);

  // App Tauri : la barre de titre native suit aussi le choix (null = suivre le système).
  if (isTauri()) {
    const syncWindow = (pref: ThemePref) =>
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => getCurrentWindow().setTheme(pref === "system" ? null : pref))
        .catch(() => {
          /* pas de barre de titre à thème sur cette plateforme (mobile) */
        });
    syncWindow(useSettings.getState().themePref);
    useSettings.subscribe((s, prev) => s.themePref !== prev.themePref && syncWindow(s.themePref));
  }

  // Le système passe en sombre (ou en clair) : on suit si l'auteur l'a demandé.
  darkQuery()?.addEventListener("change", () => {
    const { themePref } = useSettings.getState();
    if (themePref === "system") useSettings.setState({ theme: resolve("system") });
  });
}
