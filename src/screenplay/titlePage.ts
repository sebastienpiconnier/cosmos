// Page de titre d'un scénario : les champs que l'interface propose, et leur clé dans le fichier
// Fountain (« Title: », « Author: »…). Les clés sont celles du format, identiques dans toutes les langues.

import type { Screenplay } from "./model";

export type TitleField = "title" | "credit" | "author" | "source" | "date" | "contact" | "copyright";

/** Dans l'ordre d'écriture du fichier : la clé canonique, puis les variantes acceptées à la lecture. */
const KEYS: Record<TitleField, string[]> = {
  title: ["Title"],
  credit: ["Credit"],
  author: ["Author", "Authors"],
  source: ["Source"],
  date: ["Draft date"],
  contact: ["Contact"],
  copyright: ["Copyright"],
};
export const TITLE_FIELDS = Object.keys(KEYS) as TitleField[];

const fold = (key: string) => key.trim().toLowerCase();
const keyOf = (titlePage: Screenplay["titlePage"], field: TitleField) =>
  Object.keys(titlePage).find((key) => KEYS[field].some((name) => fold(name) === fold(key)));

export function readTitleField(titlePage: Screenplay["titlePage"], field: TitleField): string {
  const key = keyOf(titlePage, field);
  return key ? titlePage[key] : "";
}

/**
 * Écrit un champ (une valeur vide le retire). Les champs connus sont rangés dans l'ordre habituel
 * d'une page de titre, les autres clés du fichier (« Notes: », « Revision: »…) gardées à la suite.
 * Rend le même objet si rien ne change.
 */
export function writeTitleField(titlePage: Screenplay["titlePage"], field: TitleField, value: string): Screenplay["titlePage"] {
  // Fins de ligne et espaces en trop : une valeur de plusieurs lignes garde ses lignes non vides.
  const next = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  if (next === readTitleField(titlePage, field)) return titlePage;

  const known: Record<string, string> = {};
  for (const f of TITLE_FIELDS) {
    const key = keyOf(titlePage, f);
    const text = f === field ? next : key ? titlePage[key] : "";
    // La clé déjà présente est gardée telle qu'elle est écrite (« Authors » reste « Authors »).
    if (text) known[key ?? KEYS[f][0]] = text;
  }
  const others = Object.fromEntries(Object.entries(titlePage).filter(([key]) => !TITLE_FIELDS.some((f) => keyOf({ [key]: "" }, f))));
  return { ...known, ...others };
}
