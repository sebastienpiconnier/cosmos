// @vitest-environment happy-dom
// Visite guidée, coupure de scène annulable, questions « À creuser » regroupées.

import { beforeEach, describe, expect, it } from "vitest";
import { TOUR_STEPS, nextStep, prevStep, stepText } from "../tour";
import { fr } from "../i18n/fr";
import { en } from "../i18n/en";
import { EMPTY_PLAN } from "../plan";
import { useCosmos } from "../store";
import { useSettings } from "../settings";

describe("visite guidée", () => {
  it("une étape par vue, du canevas à l'écriture, des textes dans les deux langues", () => {
    expect(TOUR_STEPS.map((s) => s.view)).toEqual(["toile", "toile", "bible", "plan", "manuscrit", "toile"]);
    expect(nextStep(0)).toBe(1);
    expect(nextStep(TOUR_STEPS.length - 1)).toBeNull();
    expect(prevStep(0)).toBe(0);
    for (const step of TOUR_STEPS) {
      expect(fr.tour.steps[step.key].body.length).toBeGreaterThan(40);
      expect(en.tour.steps[step.key].body.length).toBeGreaterThan(40);
    }
    expect(stepText(fr.tour.steps, fr.tour.scenario, "write", "scenario").title).toBe("Écris au format scénario");
    expect(stepText(fr.tour.steps, fr.tour.scenario, "cards", "scenario")).toBe(fr.tour.steps.cards);
  });
});

describe("coupure de scène annulable", () => {
  const state = () => useCosmos.getState();
  beforeEach(async () => {
    localStorage.clear();
    useSettings.setState({ lang: "fr" });
    useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, plan: EMPTY_PLAN, manuscript: {}, lastFiles: {}, past: [], future: [], pitch: {} });
    await state().start();
    await state().createProject({ title: "K", kind: "roman" });
  });

  it("le texte parti dans la nouvelle scène revient à la fin de la première, la carte disparaît", () => {
    const a = state().addTitledCard("scene", "Le phare");
    state().setManuscriptText(a, "<p>Début.</p>");
    const b = state().splitScene(a, "<p>Suite.</p>")!;
    expect(state().manuscript[b]).toBe("<p>Suite.</p>");
    state().joinScenes(b, a);
    expect(state().manuscript[a]).toBe("<p>Début.</p><p>Suite.</p>");
    expect(state().manuscript[b]).toBeUndefined();
    expect(state().nodes.some((n) => n.id === b)).toBe(false);
  });

  it("l'exemple s'ouvre sur la visite guidée", async () => {
    state().setTour(null);
    await state().closeProject(true);
    await state().tryExample();
    expect(state().tour).toBe(0);
  });
});
