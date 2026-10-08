// Fiche d'un personnage : des caractéristiques standard, facultatives, et les questions gardées pour
// plus tard. Fonctions pures.
//
// Dans cartes/<id>.md, deux lignes facultatives du frontmatter :
//   fiche: {"age":"34","metier":"Gardienne de phare"}
//   questions: ["Que cache-t-elle aux autres ?"]
// Les clés de la fiche sont écrites dans le fichier : ne jamais les renommer ni les traduire.

import type { CardData, Link } from "./types";

/** Caractéristiques standard, dans l'ordre de la fiche. Libellés : `t.character.fields`. */
export const CHARACTER_FIELDS = [
  "role",
  "age",
  "metier",
  "origine",
  "apparence",
  "personnalite",
  "objectif",
  "besoin",
  "faille",
  "peur",
  "secret",
  "arc",
] as const;
export type CharacterField = (typeof CHARACTER_FIELDS)[number];

/** Champs courts (une ligne) ; les autres sont des zones de texte qui grandissent. */
export const SHORT_FIELDS: ReadonlySet<CharacterField> = new Set(["role", "age", "metier", "origine"]);

const MAX_VALUE = 2000;
const MAX_QUESTIONS = 200;

/** Fiche lue sur disque : seules les clés connues et les textes sont gardés. */
export function readFiche(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const key of CHARACTER_FIELDS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) out[key] = value.slice(0, MAX_VALUE);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Questions lues sur disque : des textes non vides, sans doublon. */
export function readQuestions(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = [...new Set(raw.filter((q): q is string => typeof q === "string").map((q) => q.trim()).filter(Boolean))].slice(0, MAX_QUESTIONS);
  return list.length > 0 ? list : undefined;
}

/** Fiche après modification d'un champ (vidé : retiré). undefined quand plus rien n'est rempli. */
export function setFicheField(fiche: Record<string, string> | undefined, key: CharacterField, value: string): Record<string, string> | undefined {
  const next = { ...(fiche ?? {}) };
  if (value.trim()) next[key] = value;
  else delete next[key];
  return Object.keys(next).length > 0 ? next : undefined;
}

export const ficheCount = (card: Pick<CardData, "fiche">) => Object.values(card.fiche ?? {}).filter((v) => v.trim()).length;

/** Questions de la carte, plus une. Même tableau si elle y est déjà. */
export function addQuestion(list: string[] | undefined, question: string): string[] | undefined {
  const q = question.trim();
  if (!q || list?.includes(q)) return list;
  return [...(list ?? []), q];
}

/** Questions de la carte, moins une. undefined quand il n'en reste aucune. */
export function removeQuestion(list: string[] | undefined, question: string): string[] | undefined {
  if (!list?.includes(question)) return list;
  const next = list.filter((q) => q !== question);
  return next.length > 0 ? next : undefined;
}

/**
 * Anciennes cartes Question créées par « Je ne sais pas encore » (versions précédentes) : sans texte,
 * reliées par un seul fil, étiqueté « à creuser », à un personnage dont elles portent le nom en tête.
 * Rend, pour chacune, le personnage et la question à ranger dans sa carte.
 */
export function legacyParkedCards(cards: CardData[], links: Pick<Link, "source" | "target" | "label">[], labels: string[]): { cardId: string; characterId: string; question: string }[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const found: { cardId: string; characterId: string; question: string }[] = [];
  for (const card of cards) {
    if (card.type !== "question" || (card.html && card.html !== "<p></p>") || card.image) continue;
    const own = links.filter((l) => l.source === card.id || l.target === card.id);
    if (own.length !== 1 || !labels.includes(own[0].label)) continue;
    const other = byId.get(own[0].source === card.id ? own[0].target : own[0].source);
    if (!other || other.type !== "personnage") continue;
    const name = other.title.trim();
    const title = card.title.trim();
    const question = name && title.startsWith(`${name} : `) ? title.slice(name.length + 3).trim() : name ? "" : title;
    if (question) found.push({ cardId: card.id, characterId: other.id, question });
  }
  return found;
}
