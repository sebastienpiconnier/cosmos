// Mini-système de traduction, sans dépendance.
// - Les textes vivent dans fr.ts (référence) et en.ts ; ajouter une langue = un fichier
//   typé `Messages` + une ligne dans DICTIONARIES (langs.ts).
// - Les composants lisent les textes avec useT() ; le code hors React avec getT().
// - La langue choisie est un réglage de l'appareil (voir settings.ts), jamais stockée
//   dans le projet : un projet écrit en français s'ouvre aussi dans l'interface anglaise.

import type { Messages } from "./fr";
import { DICTIONARIES } from "./langs";
import { useSettings } from "../settings";

export type { Messages };
export { DICTIONARIES, LANGS, detectLang, isLang, type Lang } from "./langs";

/** Remplace les {variables} : fmt("Type : {type}", { type: "Lieu" }). */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}

export function useT(): Messages {
  return DICTIONARIES[useSettings((s) => s.lang)];
}

export function getT(): Messages {
  return DICTIONARIES[useSettings.getState().lang];
}
