// Lecture du scénario par scènes : liste, personnages présents, décor. Fonctions pures,
// utilisées par la liste des scènes et le panneau « Dans cette scène ».

import type { ScreenplayElement } from "./model";

export interface Scene {
  /** Rang dans le scénario, à partir de 1. */
  number: number;
  /** Index de l'en-tête dans `elements`. */
  index: number;
  /** Index du premier élément après la scène. */
  end: number;
  text: string;
  cardId?: string;
}

export function listScenes(elements: ScreenplayElement[]): Scene[] {
  const scenes: Scene[] = [];
  elements.forEach((el, index) => {
    if (el.type !== "sceneHeading") return;
    if (scenes.length > 0) scenes[scenes.length - 1].end = index;
    scenes.push({ number: scenes.length + 1, index, end: elements.length, text: el.text, cardId: el.cardId });
  });
  return scenes;
}

/** La scène qui contient l'élément donné (null avant le premier en-tête). */
export function sceneAt(scenes: Scene[], elementIndex: number): Scene | null {
  let found: Scene | null = null;
  for (const scene of scenes) {
    if (scene.index > elementIndex) break;
    found = scene;
  }
  return found;
}

/** Nom sans extension ni marque de dialogue double : « HUGO (V.O.) » → « HUGO ». */
export function characterName(text: string): string {
  let name = text.trim().replace(/\s*\^$/, "");
  for (;;) {
    const shorter = name.replace(/\s*\([^()]*\)$/, "");
    if (shorter === name) break;
    name = shorter;
  }
  return name.trim();
}

/** Personnages qui parlent dans la scène, par ordre d'entrée, avec leur nombre de répliques. */
export function sceneCharacters(elements: ScreenplayElement[], scene: Scene): { name: string; lines: number }[] {
  const lines = new Map<string, number>();
  for (const el of elements.slice(scene.index, scene.end)) {
    if (el.type !== "character") continue;
    const name = characterName(el.text);
    if (name) lines.set(name, (lines.get(name) ?? 0) + 1);
  }
  return [...lines].map(([name, count]) => ({ name, lines: count }));
}

const PREFIX_RE = /^(int\.?\/ext\.?|int\.?|ext\.?|est\.?|i\/e\.?)(?=\s|$)\s*/i;

/** « INT. PHARE, LANTERNE - NUIT » → préfixe, décor, moment. Un en-tête libre est tout entier un décor. */
export function headingParts(text: string): { prefix: string; location: string; time: string } {
  const trimmed = text.trim();
  const prefix = PREFIX_RE.exec(trimmed);
  const rest = prefix ? trimmed.slice(prefix[0].length) : trimmed;
  const cut = rest.lastIndexOf(" - ");
  return {
    prefix: prefix ? prefix[1] : "",
    location: (cut === -1 ? rest : rest.slice(0, cut)).trim(),
    time: cut === -1 ? "" : rest.slice(cut + 3).trim(),
  };
}

/** Nombre de scènes qui se passent dans le même décor (sans tenir compte de la casse). */
export function scenesInLocation(scenes: Scene[], location: string, locale: string): number {
  const key = location.toLocaleUpperCase(locale);
  if (!key) return 0;
  return scenes.filter((s) => headingParts(s.text).location.toLocaleUpperCase(locale) === key).length;
}
