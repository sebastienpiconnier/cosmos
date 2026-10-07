// Lien entre les en-têtes de scène du scénario et les cartes Scène de la toile.
// Un en-tête lié porte la note [[cosmos:<id>]] (cardId dans le modèle). Fonctions pures :
// elles rendent le même objet quand rien ne change, pour ne pas réécrire le fichier sans raison.

import type { Screenplay, ScreenplayElement } from "./model";

/** Ce qu'il faut savoir d'une carte Scène pour la relier. */
export interface SceneCard {
  id: string;
  title: string;
}

const isLinkedTo = (el: ScreenplayElement, cardId: string) => el.type === "sceneHeading" && el.cardId === cardId;

/** Texte de l'en-tête lié à chaque carte. Si deux en-têtes citent la même carte, le premier compte. */
export function headingTitles(screenplay: Screenplay): Map<string, string> {
  const titles = new Map<string, string>();
  for (const el of screenplay.elements) {
    if (el.type === "sceneHeading" && el.cardId && !titles.has(el.cardId)) titles.set(el.cardId, el.text);
  }
  return titles;
}

/** Le titre de la carte a changé : son en-tête suit. Un titre vide ne touche à rien (l'en-tête disparaîtrait). */
export function renameHeading(screenplay: Screenplay, cardId: string, title: string): Screenplay {
  const text = title.trim();
  const index = screenplay.elements.findIndex((el) => isLinkedTo(el, cardId));
  if (index === -1 || text === "" || screenplay.elements[index].text === text) return screenplay;
  const elements = screenplay.elements.slice();
  elements[index] = { ...elements[index], text };
  return { ...screenplay, elements };
}

/** La carte disparaît : la note de lien est retirée, le texte de la scène reste. */
export function unlinkCard(screenplay: Screenplay, cardId: string): Screenplay {
  if (!screenplay.elements.some((el) => isLinkedTo(el, cardId))) return screenplay;
  const elements = screenplay.elements.map((el) => {
    if (!isLinkedTo(el, cardId)) return el;
    const { cardId: _removed, ...rest } = el;
    return rest;
  });
  return { ...screenplay, elements };
}

/** Scènes « libres » : en-têtes sans note, ou dont la carte n'existe plus. `index` = position dans `elements`. */
export function scenesWithoutCard(
  screenplay: Screenplay,
  sceneCardIds: Iterable<string>,
): { index: number; text: string }[] {
  const known = new Set(sceneCardIds);
  const free: { index: number; text: string }[] = [];
  screenplay.elements.forEach((el, index) => {
    if (el.type === "sceneHeading" && !(el.cardId && known.has(el.cardId))) free.push({ index, text: el.text });
  });
  return free;
}

/** Cartes Scène qui n'ont pas encore de scène dans le fichier (panneau « Scènes à écrire »). */
export function cardsWithoutScene(screenplay: Screenplay, cards: SceneCard[]): SceneCard[] {
  const linked = headingTitles(screenplay);
  return cards.filter((card) => !linked.has(card.id));
}

/**
 * Premier scenario.fountain d'un projet : une page de titre et un en-tête par carte Scène, dans
 * l'ordre reçu. Les cartes sans titre attendent dans « Scènes à écrire ».
 */
export function initialScreenplay(title: string, cards: SceneCard[]): Screenplay {
  return {
    titlePage: title.trim() ? { Title: title.trim() } : {},
    elements: cards
      .filter((card) => card.title.trim() !== "")
      .map((card) => ({ type: "sceneHeading", text: card.title.trim(), cardId: card.id })),
  };
}
