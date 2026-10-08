// Rubriques de la Bible : ordre et rubriques masquées, réglage de l'appareil (comme la présentation du Plan).
// Fonctions pures. Une rubrique masquée disparaît du sommaire ; ses fiches restent des cartes du canevas.

import { BIBLE_ORDER, CARD_TYPES, type CardType } from "./types";

export interface BibleSections {
  /** Ordre choisi. Un type absent (ajouté par une version plus récente) se range à sa place par défaut. */
  order: CardType[];
  hidden: CardType[];
}

export const DEFAULT_SECTIONS: BibleSections = { order: BIBLE_ORDER, hidden: [] };

const isType = (v: unknown): v is CardType => CARD_TYPES.includes(v as CardType);

export function readSections(raw: unknown): BibleSections {
  if (!raw || typeof raw !== "object") return DEFAULT_SECTIONS;
  const { order, hidden } = raw as { order?: unknown; hidden?: unknown };
  return {
    order: Array.isArray(order) ? [...new Set(order.filter(isType))] : BIBLE_ORDER,
    hidden: Array.isArray(hidden) ? [...new Set(hidden.filter(isType))] : [],
  };
}

/** Toutes les rubriques, dans l'ordre choisi ; celles que l'ordre ignore s'insèrent après leur voisine par défaut. */
export function sectionOrder(prefs: BibleSections): CardType[] {
  const out = prefs.order.filter(isType);
  for (const type of BIBLE_ORDER) {
    if (out.includes(type)) continue;
    const before = BIBLE_ORDER.slice(0, BIBLE_ORDER.indexOf(type)).reverse().find((t) => out.includes(t));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, type);
  }
  return out;
}

/** Rubriques affichées, dans l'ordre. */
export const visibleSections = (prefs: BibleSections) => sectionOrder(prefs).filter((t) => !prefs.hidden.includes(t));

export function moveSection(prefs: BibleSections, type: CardType, way: "up" | "down"): BibleSections {
  const order = sectionOrder(prefs);
  const i = order.indexOf(type);
  const j = way === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= order.length) return prefs;
  [order[i], order[j]] = [order[j], order[i]];
  return { ...prefs, order };
}

export function toggleSection(prefs: BibleSections, type: CardType): BibleSections {
  const hidden = prefs.hidden.includes(type) ? prefs.hidden.filter((t) => t !== type) : [...prefs.hidden, type];
  return { ...prefs, hidden };
}
