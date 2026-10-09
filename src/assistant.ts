// Assistant personnage : des questions par niveau, pour creuser une fiche. Fonctions pures.
// L'assistant questionne, l'auteur écrit. Une réponse s'ajoute au texte de la fiche (la question en
// gras, la réponse dessous), et « Je ne sais pas encore » range la question dans la carte du personnage
// (champ `questions`), sans rien poser sur le canevas : la carte affiche seulement leur nombre.

import type { CardData, Link } from "./types";
import type { CharacterField } from "./character";

export const ASSISTANT_LEVELS = ["essentiel", "approfondi", "intime"] as const;
export type AssistantLevel = (typeof ASSISTANT_LEVELS)[number];

/** Questions de chaque niveau : clés des textes (`t.assistant.questions`). */
export const ASSISTANT_QUESTIONS = {
  essentiel: ["want", "obstacle", "role", "look", "voice", "strength", "flaw", "change"],
  approfondi: ["need", "past", "secret", "fear", "relation", "habit", "contradiction", "work"],
  intime: ["shame", "loss", "lie", "limit", "joy", "night", "regret", "last"],
} as const satisfies Record<AssistantLevel, readonly string[]>;

export type AssistantQuestion = (typeof ASSISTANT_QUESTIONS)[AssistantLevel][number];

/**
 * Champ de la fiche auquel répond une question. Après une réponse, si ce champ est vide, l'assistant
 * propose de l'y reporter aussi (la réponse de l'auteur, telle quelle, sur son clic).
 */
export const QUESTION_FIELD: Partial<Record<AssistantQuestion, CharacterField>> = {
  want: "objectif",
  need: "besoin",
  past: "blessure",
  voice: "voix",
  strength: "force",
  flaw: "faille",
  fear: "peur",
  secret: "secret",
  role: "role",
  look: "apparence",
};

/** Champ où reporter une réponse, s'il existe et qu'il est encore vide. */
export function fieldToFill(key: string | null | undefined, character: Pick<CardData, "fiche">): CharacterField | null {
  const field = key ? QUESTION_FIELD[key as AssistantQuestion] : undefined;
  return field && !character.fiche?.[field]?.trim() ? field : null;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Texte ajouté à la fiche pour une réponse : la question en gras, puis un paragraphe par ligne de réponse. */
export function answerHtml(question: string, answer: string): string {
  const lines = answer.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return `<p><strong>${escape(question)}</strong></p>${lines.map((l) => `<p>${escape(l)}</p>`).join("")}`;
}

/** Fiche complétée par une réponse. Même chaîne si la réponse est vide. */
export function appendAnswer(html: string, question: string, answer: string): string {
  const added = answerHtml(question, answer);
  if (!added) return html;
  return `${html === "<p></p>" ? "" : html}${added}`;
}

/** La fiche répond déjà à cette question (elle y figure en gras, telle qu'elle a été posée). */
export const isAnswered = (html: string, question: string) => html.includes(`<strong>${escape(question)}</strong>`);

/** Titre de la carte Question créée par « Je ne sais pas encore ». */
export const parkedTitle = (name: string, question: string) => (name.trim() ? `${name.trim()} : ${question}` : question);

/**
 * La question attend déjà : dans la carte du personnage (champ `questions`) ou, pour les projets
 * d'avant, dans une carte Question reliée au personnage.
 */
export function isParked(cards: CardData[], links: Pick<Link, "source" | "target">[], characterId: string, question: string): boolean {
  if (cards.find((c) => c.id === characterId)?.questions?.includes(question)) return true;
  const linked = new Set(links.flatMap((l) => (l.source === characterId ? [l.target] : l.target === characterId ? [l.source] : [])));
  return cards.some((c) => c.type === "question" && linked.has(c.id) && c.title.trim().endsWith(question));
}

export type QuestionState = "open" | "answered" | "parked";

export interface AskedQuestion {
  key: string;
  text: string;
  state: QuestionState;
}

/** Les questions d'un niveau pour ce personnage, avec leur état. `texts` : libellés dans la langue courante. */
export function levelQuestions(
  level: AssistantLevel,
  texts: Record<string, string>,
  character: CardData,
  cards: CardData[],
  links: Pick<Link, "source" | "target">[],
): AskedQuestion[] {
  return ASSISTANT_QUESTIONS[level].map((key) => {
    const text = texts[key];
    const state: QuestionState = isAnswered(character.html, text) ? "answered" : isParked(cards, links, character.id, text) ? "parked" : "open";
    return { key, text, state };
  });
}

/** Prochaine question ouverte après `after` (en boucle), ou null si le niveau est fait. */
export function nextOpen(questions: AskedQuestion[], after: string | null): AskedQuestion | null {
  const start = after ? questions.findIndex((q) => q.key === after) + 1 : 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[(start + i) % questions.length];
    if (q.state === "open") return q;
  }
  return null;
}

export interface Answered {
  question: string;
  answer: string;
}

const unescape = (text: string) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "’").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const textOf = (html: string) => unescape(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/**
 * Le texte d'une fiche séparé en deux : les notes libres, et les réponses aux questions de l'assistant
 * (un paragraphe tout en gras qui finit par « ? », suivi des paragraphes de réponse jusqu'au gras suivant).
 */
export function splitAnswers(html: string): { notes: string; answers: Answered[] } {
  const blocks = html.match(/<(p|h[1-6]|li|blockquote)\b[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  const notes: string[] = [];
  const answers: Answered[] = [];
  let current: Answered | null = null;
  for (const block of blocks) {
    const question = block.match(/^<p[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>$/i);
    const asked = question ? textOf(question[1]) : "";
    if (asked.endsWith("?")) {
      current = { question: asked, answer: "" };
      answers.push(current);
      continue;
    }
    const text = textOf(block);
    if (!text) continue;
    if (current) current.answer = current.answer ? `${current.answer}\n${text}` : text;
    else notes.push(text);
  }
  return { notes: notes.join("\n"), answers: answers.filter((a) => a.answer) };
}
