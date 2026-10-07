// Manuscrit d'un roman : un texte par scène, dans l'ordre du Plan. Fonctions pures.
// Sur disque : manuscrit/<id de la carte Scène>.md, du Markdown sans en-tête (le titre reste celui de la carte).

import type { CardData } from "./types";
import { plainText } from "./search";

/** Texte de chaque scène, en HTML (format de travail de l'éditeur), par identifiant de carte. */
export type Manuscript = Record<string, string>;

export const isBlank = (html: string | undefined) => !html || plainText(html) === "";

/** Nombre de mots d'un texte (HTML de l'éditeur). Les apostrophes et traits d'union ne coupent pas un mot. */
export function countWords(html: string | undefined): number {
  if (!html) return 0;
  return plainText(html).match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export const totalWords = (manuscript: Manuscript, ids: string[]) => ids.reduce((sum, id) => sum + countWords(manuscript[id]), 0);

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, word: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, "u").test(text);

/**
 * Personnages et lieux cités dans le texte d'une scène : par leur titre entier, ou, pour un personnage,
 * par son prénom (premier mot du titre, s'il fait au moins trois lettres). Sans casse ni accents.
 */
export function detectCards(html: string | undefined, cards: CardData[]): CardData[] {
  const text = fold(html ? plainText(html) : "");
  if (!text) return [];
  return cards.filter((card) => {
    if (card.type !== "personnage" && card.type !== "lieu") return false;
    const title = fold(card.title).trim();
    if (!title) return false;
    if (hasWord(text, title)) return true;
    const first = title.split(/\s+/)[0];
    return card.type === "personnage" && first.length >= 3 && first !== title && hasWord(text, first);
  });
}

/** Textes dont la carte Scène n'existe plus : ils restent dans le projet, jamais effacés par l'app. */
export function orphanTexts(manuscript: Manuscript, sceneIds: string[]): string[] {
  const scenes = new Set(sceneIds);
  return Object.keys(manuscript).filter((id) => !scenes.has(id) && !isBlank(manuscript[id]));
}
