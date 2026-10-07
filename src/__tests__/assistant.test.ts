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

  it("répondre complète la fiche, et s'annule", () => {
    state().answerQuestion(ines, q.want, "Le silence.");
    expect(isAnswered(data().html, q.want)).toBe(true);
    expect(state().status).toBe("modifie");
    state().undo();
    expect(data().html).toBe("");
    // Réponse vide ou carte inconnue : rien.
    const past = state().past.length;
    state().answerQuestion(ines, q.want, "  ");
    state().answerQuestion("inconnu", q.want, "x");
    expect(state().past.length).toBe(past);
  });

  it("« Je ne sais pas encore » : une carte Question reliée au personnage, une seule fois, en une étape", () => {
    const id = state().parkQuestion(ines, q.secret)!;
    expect(state().nodes.find((n) => n.id === id)!.data).toMatchObject({ type: "question", title: `Inès Morvan : ${q.secret}` });
    expect(state().edges).toMatchObject([{ source: id, target: ines, label: "à creuser", type: "floating" }]);
    expect(state().parkQuestion(ines, q.secret)).toBeNull();
    expect(state().nodes).toHaveLength(2);
    state().undo();
    expect(state().nodes).toHaveLength(1);
    expect(state().edges).toHaveLength(0);
  });

  it("la carte Question ne chevauche pas le personnage", () => {
    const id = state().parkQuestion(ines, q.fear)!;
    const [a, b] = [ines, id].map((x) => state().nodes.find((n) => n.id === x)!.position);
    expect(a.x !== b.x || a.y !== b.y).toBe(true);
  });
});
