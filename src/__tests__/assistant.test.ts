// @vitest-environment happy-dom
// Assistant personnage : questions par niveau, réponses ajoutées à la fiche, questions gardées pour plus tard.

import { beforeEach, describe, expect, it } from "vitest";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { EMPTY_PLAN } from "../plan";
import { htmlToMarkdown, markdownToHtml } from "../storage/markdown";
import { fr } from "../i18n/fr";
import { en } from "../i18n/en";
import {
  ASSISTANT_LEVELS,
  ASSISTANT_QUESTIONS,
  answerHtml,
  appendAnswer,
  isAnswered,
  isParked,
  levelQuestions,
  nextOpen,
  parkedTitle,
} from "../assistant";
import type { CardData } from "../types";

const q = fr.assistant.questions;
const card = (id: string, type: CardData["type"], title: string, html = ""): CardData => ({ id, type, title, html });

describe("banque de questions", () => {
  it("trois niveaux de huit questions, toutes différentes, en français et en anglais", () => {
    expect(ASSISTANT_LEVELS).toEqual(["essentiel", "approfondi", "intime"]);
    const keys = ASSISTANT_LEVELS.flatMap((l) => [...ASSISTANT_QUESTIONS[l]]);
    expect(keys).toHaveLength(24);
    expect(new Set(keys).size).toBe(24);
    for (const texts of [fr.assistant.questions, en.assistant.questions]) {
      expect(new Set(keys.map((k) => texts[k])).size).toBe(24);
      for (const k of keys) expect(texts[k].trim().endsWith("?")).toBe(true);
    }
    for (const l of ASSISTANT_LEVELS) expect(fr.assistant.levels[l] && en.assistant.levels[l] && fr.assistant.levelHints[l] && en.assistant.levelHints[l]).toBeTruthy();
  });
});

describe("réponse ajoutée à la fiche", () => {
  it("la question en gras, un paragraphe par ligne ; le texte de l'auteur n'est jamais interprété", () => {
    expect(answerHtml(q.want, "Retrouver son frère.\n\nÀ tout prix.")).toBe(`<p><strong>${q.want}</strong></p><p>Retrouver son frère.</p><p>À tout prix.</p>`);
    expect(answerHtml(q.want, "<b>x</b> & y")).toContain("<p>&lt;b&gt;x&lt;/b&gt; &amp; y</p>");
    expect(answerHtml(q.want, "  \n ")).toBe("");
  });

  it("à la suite du texte existant ; réponse vide : rien ne change", () => {
    expect(appendAnswer("<p>Gardienne.</p>", q.want, "Le silence.")).toBe(`<p>Gardienne.</p><p><strong>${q.want}</strong></p><p>Le silence.</p>`);
    expect(appendAnswer("<p></p>", q.want, "Le silence.")).toBe(`<p><strong>${q.want}</strong></p><p>Le silence.</p>`);
    expect(appendAnswer("<p>Gardienne.</p>", q.want, " ")).toBe("<p>Gardienne.</p>");
  });

  it("retrouvée dans la fiche, y compris après un passage par le fichier Markdown", () => {
    const html = appendAnswer("", q.obstacle, "La marée.");
    expect(isAnswered(html, q.obstacle)).toBe(true);
    expect(isAnswered(html, q.want)).toBe(false);
    expect(htmlToMarkdown(html)).toBe(`**${q.obstacle}**\n\nLa marée.`);
    expect(isAnswered(markdownToHtml(htmlToMarkdown(html)), q.obstacle)).toBe(true);
  });
});

describe("question gardée pour plus tard", () => {
  const cards = [card("p1", "personnage", "Inès Morvan"), card("q1", "question", parkedTitle("Inès Morvan", q.secret)), card("q2", "question", q.fear), card("i1", "idee", q.past)];

  it("titre de la carte : le nom, puis la question", () => {
    expect(parkedTitle("Inès Morvan", q.secret)).toBe(`Inès Morvan : ${q.secret}`);
    expect(parkedTitle("  ", q.secret)).toBe(q.secret);
  });

  it("reconnue par une carte Question reliée au personnage, dans un sens ou dans l'autre", () => {
    expect(isParked(cards, [{ source: "q1", target: "p1" }], "p1", q.secret)).toBe(true);
    expect(isParked(cards, [{ source: "p1", target: "q2" }], "p1", q.fear)).toBe(true);
    // Pas reliée, ou pas une carte Question : la question reste ouverte.
    expect(isParked(cards, [], "p1", q.secret)).toBe(false);
    expect(isParked(cards, [{ source: "i1", target: "p1" }], "p1", q.past)).toBe(false);
  });
});

describe("où l'on en est", () => {
  const character = card("p1", "personnage", "Inès", appendAnswer("", q.want, "Le silence."));
  const cards = [character, card("q1", "question", parkedTitle("Inès", q.role))];
  const list = levelQuestions("essentiel", q, character, cards, [{ source: "q1", target: "p1" }]);

  it("état de chaque question du niveau", () => {
    expect(list.map((x) => x.state)).toEqual(["answered", "open", "parked", "open", "open", "open", "open", "open"]);
    expect(list[1]).toMatchObject({ key: "obstacle", text: q.obstacle });
  });

  it("question suivante : la première ouverte, puis en boucle ; plus rien quand le niveau est fait", () => {
    expect(nextOpen(list, null)!.key).toBe("obstacle");
    expect(nextOpen(list, "obstacle")!.key).toBe("look");
    expect(nextOpen(list, "change")!.key).toBe("obstacle");
    expect(nextOpen(list.map((x) => ({ ...x, state: "answered" as const })), null)).toBeNull();
  });
});

describe("assistant dans le projet", () => {
  const state = () => useCosmos.getState();
  let ines = "";

  beforeEach(async () => {
    localStorage.clear();
    useSettings.setState({ lang: "fr" });
    useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, plan: EMPTY_PLAN, manuscript: {}, lastFiles: {}, past: [], future: [] });
    await state().start();
    await state().createProject({ title: "Kerlaouen", kind: "roman" });
    ines = state().addTitledCard("personnage", "Inès Morvan");
  });
  const data = () => state().nodes.find((n) => n.id === ines)!.data;

  it("répondre remplit le champ lié de la fiche (ou range la réponse), et s'annule", () => {
    state().answerQuestion(ines, "want", q.want, "Le silence.");
    expect(data().fiche?.objectif).toBe("Le silence.");
    expect(data().html).toBe("");
    expect(state().status).toBe("modifie");
    // Champ déjà rempli : la réponse est rangée à part, le champ n'est pas écrasé.
    state().answerQuestion(ines, "want", q.want, "Autre chose.");
    expect(data().fiche?.objectif).toBe("Le silence.");
    expect(data().reponses).toEqual({ want: "Autre chose." });
    // Question sans champ : rangée.
    state().answerQuestion(ines, "night", q.night, "La mer.");
    expect(data().reponses?.night).toBe("La mer.");
    state().undo();
    expect(data().reponses?.night).toBeUndefined();
    // Réponse vide ou carte inconnue : rien.
    const past = state().past.length;
    state().answerQuestion(ines, "want", q.want, "  ");
    state().answerQuestion("inconnu", "want", q.want, "x");
    expect(state().past.length).toBe(past);
  });

  it("« Je ne sais pas encore » : la question reste dans la carte du personnage, une seule fois, en une étape", () => {
    expect(state().parkQuestion(ines, q.secret)).toBe(true);
    expect(data().questions).toEqual([q.secret]);
    expect(state().nodes).toHaveLength(1);
    expect(state().edges).toHaveLength(0);
    expect(state().parkQuestion(ines, q.secret)).toBe(false);
    state().undo();
    expect(data().questions).toBeUndefined();
  });

  it("répondre à une question en attente la retire de la liste", () => {
    state().parkQuestion(ines, q.fear);
    state().parkQuestion(ines, q.secret);
    state().answerQuestion(ines, "fear", q.fear, "Le noir.");
    expect(data().questions).toEqual([q.secret]);
    state().dropQuestion(ines, q.secret);
    expect(data().questions).toBeUndefined();
  });

  it("la fiche d'identité : un champ rempli, vidé, annulable", () => {
    state().setFiche(ines, "age", "34");
    state().setFiche(ines, "metier", "Gardienne");
    expect(data().fiche).toEqual({ age: "34", metier: "Gardienne" });
    state().setFiche(ines, "age", "");
    expect(data().fiche).toEqual({ metier: "Gardienne" });
    state().undo();
    expect(data().fiche).toEqual({ age: "34", metier: "Gardienne" });
  });
});
