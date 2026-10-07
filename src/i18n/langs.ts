// Langues disponibles et détection. Sans dépendance vers les réglages
// (settings.ts l'importe : pas d'import circulaire).

import { fr, type Messages } from "./fr";
import { en } from "./en";

export const DICTIONARIES = { fr, en } satisfies Record<string, Messages>;
export type Lang = keyof typeof DICTIONARIES;
export const LANGS = Object.keys(DICTIONARIES) as Lang[];

export const isLang = (v: unknown): v is Lang => typeof v === "string" && v in DICTIONARIES;

/** Langue du système si elle est disponible, sinon anglais. */
export function detectLang(): Lang {
  const prefs = typeof navigator !== "undefined" ? [...(navigator.languages ?? []), navigator.language] : [];
  for (const tag of prefs) {
    const base = tag?.slice(0, 2).toLowerCase();
    if (isLang(base)) return base;
  }
  return "en";
}
