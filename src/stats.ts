// Statistiques du manuscrit d'un roman : longueur, pages, temps de lecture, avancement, objectifs.
// Fonctions pures. L'idée des objectifs vient de NEO (Hugh Howey) : un objectif de mots par jour, un
// objectif pour le livre, et le compte des mots écrits chaque jour.
//
// Dans cosmos.json (facultatifs) :
//   "goals": { "daily": 500, "total": 80000 }
//   "progress": { "2026-10-08": { "start": 12000, "end": 12650 } }   (total du manuscrit au début et à la fin du jour)

import { countWords, isBlank, type Manuscript } from "./manuscript";

/** Mots par page d'un roman imprimé (format poche ou broché) : c'est aussi la page du Manuscrit à l'écran. */
export const WORDS_PER_PAGE = 250;
/** Vitesse de lecture silencieuse d'un adulte, en mots par minute. */
export const WORDS_PER_MINUTE = 230;
/** Jours d'avancement gardés dans le fichier. */
const KEEP_DAYS = 90;

export interface Goals {
  /** Mots par jour. */
  daily?: number;
  /** Mots pour le livre entier. */
  total?: number;
}

export type Progress = Record<string, { start: number; end: number }>;

const positive = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : undefined);

export function readGoals(raw: unknown): Goals {
  if (!raw || typeof raw !== "object") return {};
  const { daily, total } = raw as Record<string, unknown>;
  return { ...(positive(daily) ? { daily: positive(daily) } : {}), ...(positive(total) ? { total: positive(total) } : {}) };
}

export const isDay = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key);

export function readProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Progress = {};
  for (const [day, value] of Object.entries(raw)) {
    const { start, end } = (value ?? {}) as Record<string, unknown>;
    if (isDay(day) && typeof start === "number" && typeof end === "number" && start >= 0 && end >= 0) out[day] = { start: Math.round(start), end: Math.round(end) };
  }
  return out;
}

/** Jour local au format AAAA-MM-JJ. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Avancement après une modification du manuscrit : `before` et `after`, le total de mots avant et après.
 * Le premier changement du jour fixe son point de départ. Même objet si le total ne bouge pas.
 */
export function recordProgress(progress: Progress, day: string, before: number, after: number): Progress {
  const today = progress[day];
  if (today ? today.end === after : before === after) return progress;
  const next: Progress = { ...progress, [day]: { start: today?.start ?? before, end: after } };
  const days = Object.keys(next).sort();
  for (const old of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete next[old];
  return next;
}

/** Mots écrits ce jour-là (jamais négatif : couper un passage ne fait pas reculer la journée). */
export const wordsOn = (progress: Progress, day: string) => Math.max(0, (progress[day]?.end ?? 0) - (progress[day]?.start ?? 0));

/** Jours d'affilée, jusqu'à aujourd'hui ou hier, où l'auteur a écrit. */
export function streak(progress: Progress, today: Date): number {
  let count = 0;
  const day = new Date(today);
  if (wordsOn(progress, dayKey(day)) === 0) day.setDate(day.getDate() - 1);
  while (wordsOn(progress, dayKey(day)) > 0) {
    count++;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

export interface ManuscriptStats {
  words: number;
  /** Pages estimées (au moins une dès qu'il y a un mot). */
  pages: number;
  /** Temps de lecture, en minutes. */
  minutes: number;
  scenes: number;
  written: number;
  /** Moyenne de mots par scène écrite. */
  average: number;
  /** Mots de chaque scène. */
  perScene: Map<string, number>;
}

export function manuscriptStats(manuscript: Manuscript, order: string[]): ManuscriptStats {
  const perScene = new Map(order.map((id) => [id, countWords(manuscript[id])]));
  const words = [...perScene.values()].reduce((a, b) => a + b, 0);
  const written = order.filter((id) => !isBlank(manuscript[id])).length;
  return {
    words,
    pages: pagesFor(words),
    minutes: Math.round(words / WORDS_PER_MINUTE),
    scenes: order.length,
    written,
    average: written > 0 ? Math.round(words / written) : 0,
    perScene,
  };
}

export const pagesFor = (words: number) => (words > 0 ? Math.max(1, Math.ceil(words / WORDS_PER_PAGE)) : 0);

/** Première page d'une scène : celle où se termine le texte qui la précède. */
export const firstPageOf = (wordsBefore: number) => 1 + Math.floor(wordsBefore / WORDS_PER_PAGE);
