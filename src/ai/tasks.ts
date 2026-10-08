// Ce que Cosmos demande à l'IA, et comment il relit ses réponses. Fonctions pures.
// Règle du produit : l'IA questionne et propose, elle n'écrit jamais à la place de l'auteur.
// Trois tâches : « Ranger » (proposer un type pour les idées en vrac), l'interview (une question sur
// mesure pour un personnage) et les alertes de cohérence (des contradictions possibles, sous forme de questions).

import { CARD_TYPES, type CardData, type CardType, type Link } from "../types";
import { plainText } from "../search";

const MAX_CARDS = 80;
const MAX_TEXT = 500;

const clip = (text: string, max = MAX_TEXT) => (text.length > max ? `${text.slice(0, max)}…` : text);
const brief = (card: CardData) => ({ id: card.id, type: card.type, title: card.title.trim(), text: clip(plainText(card.html)) });

/** Nom de la langue de l'interface, pour demander la réponse dans cette langue. */
const LANGUAGE: Record<string, string> = { fr: "français", en: "English" };
const language = (lang: string) => LANGUAGE[lang] ?? lang;

export interface Prompt {
  system: string;
  user: string;
}

/** Premier tableau ou objet JSON trouvé dans une réponse (les modèles l'entourent souvent de texte ou de ```). */
export function extractJson(text: string): unknown {
  const starts = [text.indexOf("["), text.indexOf("{")].filter((i) => i >= 0).sort((a, b) => a - b);
  for (const start of starts) {
    const close = text[start] === "[" ? "]" : "}";
    for (let end = text.lastIndexOf(close); end > start; end = text.lastIndexOf(close, end - 1)) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* on essaie une fin plus proche */
      }
    }
  }
  return null;
}

const asList = (value: unknown): Record<string, unknown>[] => {
  const list = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value).find(Array.isArray) : null;
  return Array.isArray(list) ? list.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
};
const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// ---------- Ranger ----------

export interface TidySuggestion {
  id: string;
  type: CardType;
  reason: string;
}

/** Cartes que « Ranger » regarde : les idées en vrac qui ont un titre ou un texte. */
export const tidyCandidates = (cards: CardData[]) => cards.filter((c) => c.type === "idee" && (c.title.trim() || plainText(c.html))).slice(0, MAX_CARDS);

export function tidyPrompt(cards: CardData[], lang: string, kind: "roman" | "scenario"): Prompt {
  return {
    system:
      `You help a writer organise the notes of a ${kind === "scenario" ? "screenplay" : "novel"}. Each note is an untyped idea card. ` +
      `Suggest a type only when the note clearly is one of: personnage (a character), lieu (a place or location), scene (something that happens, a scene), theme (a theme), question (an open question the writer asks themself). ` +
      `Leave out notes that should stay plain ideas. Never rewrite, summarise or complete the writer's text. ` +
      `Answer with a JSON array only: [{"id": "<card id>", "type": "<type>", "reason": "<one short sentence in ${language(lang)}>"}].`,
    user: JSON.stringify(tidyCandidates(cards).map(({ id, title, html }) => ({ id, title: title.trim(), text: clip(plainText(html)) }))),
  };
}

export function parseTidy(reply: string, cards: CardData[]): TidySuggestion[] {
  const known = new Map(tidyCandidates(cards).map((c) => [c.id, c]));
  const seen = new Set<string>();
  return asList(extractJson(reply)).flatMap((item) => {
    const id = str(item.id);
    const type = str(item.type) as CardType;
    if (!known.has(id) || seen.has(id) || type === "idee" || !CARD_TYPES.includes(type)) return [];
    seen.add(id);
    return [{ id, type, reason: clip(str(item.reason), 200) }];
  });
}

// ---------- Interview ----------

/** Une question sur mesure pour ce personnage, d'après sa fiche et les cartes qui lui sont reliées. */
export function interviewPrompt(character: CardData, cards: CardData[], links: Pick<Link, "source" | "target" | "label">[], lang: string, avoid: string[] = []): Prompt {
  const related = links.flatMap((l) => {
    const other = l.source === character.id ? l.target : l.target === character.id ? l.source : null;
    const card = other ? cards.find((c) => c.id === other) : undefined;
    return card ? [{ ...brief(card), link: l.label }] : [];
  });
  return {
    system:
      `You are an interviewer helping a writer discover a character. Ask ONE open question, specific to what the notes say, that the notes do not answer yet. ` +
      `Do not answer it, do not suggest answers, do not invent facts about the character. No preamble, no quotation marks: reply with the question only, in ${language(lang)}, in one sentence.`,
    user: JSON.stringify({ character: { ...brief(character), text: clip(plainText(character.html), 2500) }, related: related.slice(0, 20), alreadyAsked: avoid.slice(-12) }),
  };
}

/** La question, débarrassée de ce que les modèles ajoutent autour (guillemets, « Question : », lignes en trop). */
export function parseQuestion(reply: string): string {
  const line = reply.split("\n").map((l) => l.trim()).filter(Boolean).find((l) => l.includes("?")) ?? reply.trim().split("\n")[0] ?? "";
  return clip(line.replace(/^[-*\d.\s]*(question\s*:)?\s*/i, "").replace(/^["«“]\s*|\s*["»”]$/g, "").trim(), 300);
}

// ---------- Cohérence ----------

export interface CoherenceAlert {
  /** Cartes concernées (une ou plusieurs). */
  cards: string[];
  /** La contradiction possible, formulée comme une question à l'auteur. */
  question: string;
}

export function coherencePrompt(cards: CardData[], links: Pick<Link, "source" | "target" | "label">[], lang: string): Prompt {
  const kept = cards.filter((c) => c.title.trim() || plainText(c.html)).slice(0, MAX_CARDS);
  const ids = new Set(kept.map((c) => c.id));
  return {
    system:
      `You are a continuity reader for a writer's story bible. Find statements in the notes that contradict each other (ages, dates, places, relationships, who knows what, physical details). ` +
      `Report only real contradictions between what is written, never missing information, style, or opinions. Do not propose fixes and do not rewrite anything: phrase each one as a short question to the writer, in ${language(lang)}. ` +
      `Answer with a JSON array only: [{"cards": ["<id>", "<id>"], "question": "<question>"}]. If nothing contradicts, answer [].`,
    user: JSON.stringify({ cards: kept.map(brief), links: links.filter((l) => ids.has(l.source) && ids.has(l.target)).map(({ source, target, label }) => ({ source, target, label })) }),
  };
}

export function parseCoherence(reply: string, cards: CardData[]): CoherenceAlert[] {
  const known = new Set(cards.map((c) => c.id));
  return asList(extractJson(reply))
    .flatMap((item) => {
      const ids = [...new Set((Array.isArray(item.cards) ? item.cards : []).map(str).filter((id) => known.has(id)))];
      const question = clip(str(item.question), 400);
      return ids.length > 0 && question ? [{ cards: ids, question }] : [];
    })
    .slice(0, 12);
}
