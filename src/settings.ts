// Réglages de l'appareil (pas du projet) : langue de l'interface, apparence, nom d'auteur, service d'IA.
// Mémorisés dans le stockage local du navigateur ou de la fenêtre Tauri.

import { isFocusHighlight, type FocusHighlight } from "./focusText";
import { readSections, type BibleSections } from "./bibleSections";
import { create } from "zustand";
import { detectLang, isLang, type Lang } from "./i18n/langs";
import { isTauri } from "./platform";
import { AI_PROVIDERS, PROVIDERS, isAiProvider, type AiConfig, type AiProvider } from "./ai/providers";

export type ThemePref = "system" | "light" | "dark";
export type Theme = "light" | "dark";
/** Présentation du séquencier : en liste ou en fiches. */
export type SequencerMode = "outline" | "cards";

/**
 * IA facultative : service choisi, et pour chaque service sa clé, son modèle et son adresse.
 * Réglage de l'appareil : une clé d'API ne va jamais dans un projet.
 */
export interface AiSettings {
  provider: AiProvider | null;
  keys: Partial<Record<AiProvider, string>>;
  models: Partial<Record<AiProvider, string>>;
  urls: Partial<Record<AiProvider, string>>;
}

const NO_AI: AiSettings = { provider: null, keys: {}, models: {}, urls: {} };

function readAi(raw: unknown): AiSettings {
  if (!raw || typeof raw !== "object") return NO_AI;
  const { provider, keys, models, urls } = raw as Record<string, unknown>;
  const strings = (value: unknown) => {
    const out: Partial<Record<AiProvider, string>> = {};
    if (value && typeof value === "object") for (const p of AI_PROVIDERS) if (typeof (value as Record<string, unknown>)[p] === "string") out[p] = (value as Record<string, string>)[p];
    return out;
  };
  return { provider: isAiProvider(provider) ? provider : null, keys: strings(keys), models: strings(models), urls: strings(urls) };
}

/** Réglages du service choisi, prêts pour une requête ; null si l'IA est désactivée. */
export function aiConfig(ai: AiSettings): AiConfig | null {
  const p = ai.provider;
  if (!p) return null;
  return { provider: p, key: ai.keys[p] ?? "", model: ai.models[p] ?? PROVIDERS[p].model, url: ai.urls[p] ?? "" };
}

const KEY = "cosmos:reglages";

export interface WritingSettings {
  /** La ligne en cours reste à mi-hauteur de l'écran, comme sur une machine à écrire. */
  typewriter: boolean;
  /** Ce qui reste en pleine encre ; le reste s'estompe. */
  highlight: FocusHighlight;
}

function readWriting(raw: unknown): WritingSettings {
  const w = (raw ?? {}) as Partial<Record<keyof WritingSettings, unknown>>;
  return { typewriter: w.typewriter === true, highlight: isFocusHighlight(w.highlight) ? w.highlight : "off" };
}
const darkQuery = () => (typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined);

interface SettingsState {
  lang: Lang;
  themePref: ThemePref;
  /** Thème réellement affiché (« system » résolu). */
  theme: Theme;
  setLang: (lang: Lang) => void;
  setThemePref: (pref: ThemePref) => void;
  sequencerMode: SequencerMode;
  setSequencerMode: (mode: SequencerMode) => void;
  /** Nom d'auteur, proposé sur la page de titre des nouveaux scénarios. */
  author: string;
  setAuthor: (author: string) => void;
  ai: AiSettings;
  setAi: (ai: AiSettings) => void;
  /** Mode focus du manuscrit : machine à écrire, et ce qui reste en pleine encre. */
  writing: WritingSettings;
  setWriting: (writing: WritingSettings) => void;
  /** Rubriques de la Bible : ordre et rubriques masquées. */
  bibleSections: BibleSections;
  setBibleSections: (sections: BibleSections) => void;
}

function readSaved(): { lang?: unknown; themePref?: unknown; sequencerMode?: unknown; author?: unknown; ai?: unknown; bibleSections?: unknown; writing?: unknown } {
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
  sequencerMode: saved.sequencerMode === "cards" ? "cards" : "outline",
  setSequencerMode: (sequencerMode) => set({ sequencerMode }),
  author: typeof saved.author === "string" ? saved.author : "",
  setAuthor: (author) => set({ author }),
  ai: readAi(saved.ai),
  setAi: (ai) => set({ ai }),
  writing: readWriting(saved.writing),
  setWriting: (writing) => set({ writing }),
  bibleSections: readSections(saved.bibleSections),
  setBibleSections: (bibleSections) => set({ bibleSections }),
}));

/** Applique les réglages au document et les mémorise. À appeler une fois, avant le premier rendu. */
export function initSettings() {
  const apply = ({ lang, theme, themePref, sequencerMode, author, ai, bibleSections, writing }: SettingsState) => {
    const root = document.documentElement;
    root.lang = lang;
    root.dataset.theme = theme;
    root.style.colorScheme = theme; // barres de défilement, listes déroulantes natives
    try {
      localStorage.setItem(KEY, JSON.stringify({ lang, themePref, sequencerMode, author, ai, bibleSections, writing }));
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
