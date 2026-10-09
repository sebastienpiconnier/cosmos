// Visite guidée : quelques étapes, chacune dans une vue, pour montrer le passage du chaos au monde ordonné.
// Données pures (vue et clé du texte) ; les textes sont dans `t.tour.steps`.

import type { ProjectKind } from "./types";

export type TourView = "toile" | "bible" | "plan" | "manuscrit";

export interface TourStep {
  /** Clé du texte dans `t.tour.steps` (variante scénario dans `t.tour.scenario`, si elle existe). */
  key: "cards" | "sources" | "bible" | "plan" | "write" | "files";
  view: TourView;
}

export const TOUR_STEPS: readonly TourStep[] = [
  { key: "cards", view: "toile" },
  { key: "sources", view: "toile" },
  { key: "bible", view: "bible" },
  { key: "plan", view: "plan" },
  { key: "write", view: "manuscrit" },
  { key: "files", view: "toile" },
];

/** Étape suivante, ou null après la dernière. */
export const nextStep = (step: number): number | null => (step + 1 < TOUR_STEPS.length ? step + 1 : null);
export const prevStep = (step: number): number => Math.max(0, step - 1);

/** Texte d'une étape selon le type de projet (le scénario a parfois sa propre version). */
export function stepText<T extends Record<string, { title: string; body: string }>>(steps: T, scenario: Partial<T>, key: keyof T, kind: ProjectKind) {
  return (kind === "scenario" && scenario[key]) || steps[key];
}
