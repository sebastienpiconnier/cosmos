// Assistant personnage : des questions par niveau, pour creuser une fiche. Fonctions pures.
// L'assistant questionne, l'auteur écrit. Aucun format propre : une réponse s'ajoute au texte de la
// fiche (la question en gras, la réponse dessous), et « Je ne sais pas encore » crée une carte
// Question reliée au personnage. On retrouve donc où l'on en est en relisant les cartes.

import type { CardData, Link } from "./types";

export const ASSISTANT_LEVELS = ["essentiel", "approfondi", "intime"] as const;
export type AssistantLevel = (typeof ASSISTANT_LEVELS)[number];

/** Questions de chaque niveau : clés des textes (`t.assistant.questions`). */
export const ASSISTANT_QUESTIONS = {
  essentiel: ["want", "obstacle", "role", "look", "voice", "strength", "flaw", "change"],
  approfondi: ["need", "past", "secret", "fear", "relation", "habit", "contradiction", "work"],
  intime: ["shame", "loss", "lie", "limit", "joy", "night", "regret", "last"],
} as const satisfies Record<AssistantLevel, readonly string[]>;

export type AssistantQuestion = (typeof ASSISTANT_QUESTIONS)[AssistantLevel][number];

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

/** La question attend déjà dans une carte Question reliée au personnage. */
export function isParked(cards: CardData[], links: Pick<Link, "source" | "target">[], characterId: string, question: string): boolean {
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
