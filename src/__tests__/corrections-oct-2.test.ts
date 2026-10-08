// @vitest-environment happy-dom
// Corrections d'octobre 2026, deuxième série : pages du livre, coupure de scène, synthèse avec les réponses,
// liste des modèles, genre et surnoms des personnages.

import { beforeEach, describe, expect, it } from "vitest";
import { bookOrder, storyScenes } from "../book";
import { splitAnswers, answerHtml } from "../assistant";
import { synthesisPrompt } from "../ai/tasks";
import { readModels } from "../ai/providers";
import { cardToFile, fileToCard } from "../storage/markdown";
import { mentionsIn, detectCards } from "../manuscript";
import { EMPTY_PLAN, chapterOf } from "../plan";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import type { CardData } from "../types";

const card = (id: string, type: CardData["type"], title: string, extra: Partial<CardData> = {}): CardData => ({ id, type, title, html: "", ...extra });
const node = (data: CardData, y: number) => ({ id: data.id, data, position: { x: 0, y } });

describe("pages du livre", () => {
  it("pages de début, récit dans l'ordre du plan, pages de fin", () => {
    const nodes = [
      node(card("e", "scene", "Fin", { page: "epilogue" }), 0),
      node(card("s2", "scene", "B"), 20),
      node(card("d", "scene", "", { page: "dedicace" }), 30),
      node(card("s1", "scene", "A"), 10),
      node(card("t", "scene", "", { page: "titre" }), 40),
      node(card("x", "scene", "", { page: "inconnu" }), 50),
    ];
    expect(storyScenes(nodes)).toEqual(["s1", "s2", "x"]);
    expect(bookOrder(nodes, EMPTY_PLAN)).toEqual(["t", "d", "s1", "s2", "x", "e"]);
  });

  it("le type de page s'écrit dans le fichier de la carte, et seulement pour une scène", () => {
    const file = cardToFile(card("d", "scene", "Dédicace", { page: "dedicace" }));
    expect(file).toContain("page: dedicace");
    expect(fileToCard(file)?.page).toBe("dedicace");
    expect(cardToFile(card("i", "idee", "", { page: "dedicace" }))).not.toContain("page:");
    expect(fileToCard("---\nid: a\ntype: scene\ntitle: \"\"\npage: ../x\n---\n")?.page).toBeUndefined();
  });
});

describe("couper une scène dans le manuscrit", () => {
  const state = () => useCosmos.getState();
  beforeEach(async () => {
    localStorage.clear();
    useSettings.setState({ lang: "fr" });
    useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, plan: EMPTY_PLAN, manuscript: {}, lastFiles: {}, past: [], future: [] });
    await state().start();
    await state().createProject({ title: "Kerlaouen", kind: "roman" });
  });

  it("la nouvelle scène suit la scène coupée, dans sa case et son chapitre, avec la suite du texte", () => {
    state().setPlanTemplate("troisActes");
    const a = state().addPlanScene("A", "a_setup");
    const c = state().addPlanScene("C", "a_setup");
    const chapter = state().startChapterAt(a)!;
    const b = state().splitScene(a, "<p>La suite.</p>")!;
    expect(bookOrder(state().nodes, state().plan)).toEqual([a, b, c]);
    expect(chapterOf(state().plan, b)?.id).toBe(chapter);
    expect(state().manuscript[b]).toBe("<p>La suite.</p>");
    // Troisième Entrée : un chapitre commence à la nouvelle scène, et C le suit.
    const next = state().startChapterAt(b)!;
    expect(chapterOf(state().plan, b)?.id).toBe(next);
    expect(chapterOf(state().plan, c)?.id).toBe(next);
    expect(chapterOf(state().plan, a)?.id).toBe(chapter);
    // Annuler deux fois : la coupure disparaît.
    state().undo();
    state().undo();
    expect(state().nodes.some((n) => n.id === b)).toBe(false);
  });
});

describe("synthèse : les réponses aux questions sont envoyées à part", () => {
  it("sépare notes et réponses", () => {
    const html = `<p>Gardienne remplaçante.</p>${answerHtml("Que veut-elle ?", "Retrouver son frère.\nEt partir.")}<p><strong>Important</strong></p>${answerHtml("De quoi a-t-elle peur ?", "Du silence.")}`;
    const { notes, answers } = splitAnswers(html);
    expect(notes).toBe("Gardienne remplaçante.");
    expect(answers).toEqual([
      { question: "Que veut-elle ?", answer: "Retrouver son frère.\nEt partir.\nImportant" },
      { question: "De quoi a-t-elle peur ?", answer: "Du silence." },
    ]);
    const prompt = synthesisPrompt({ ...card("p", "personnage", "Inès"), html, fiche: { genre: "Femme" } }, [], [], "fr", { genre: "Genre" });
    const user = JSON.parse(prompt.user);
    expect(user.answers).toHaveLength(2);
    expect(user.sheet).toEqual({ Genre: "Femme" });
    expect(prompt.system).toContain("use every one of them");
  });
});

describe("modèles installés", () => {
  it("lit la liste native d'Ollama comme celle compatible OpenAI", () => {
    expect(readModels({ models: [{ name: "qwen3:8b" }, { name: "llama3.2" }, { model: "mistral" }, {}] })).toEqual(["llama3.2", "mistral", "qwen3:8b"]);
    expect(readModels({ data: [{ id: "b" }, { id: "a" }, { id: "a" }] })).toEqual(["a", "b"]);
  });
});

describe("personnage : genre, surnoms, présence dans le texte", () => {
  it("les surnoms comptent pour reconnaître le personnage", () => {
    const ines = card("p", "personnage", "Inès Morvan", { fiche: { surnoms: "la Gardienne, Nènès" } });
    expect(detectCards("<p>Nènès monte au phare.</p>", [ines])).toHaveLength(1);
    const seen = mentionsIn(ines, { s1: "<p>Rien.</p>", s2: "<p>Inès Morvan arrive. Inès sourit. La gardienne aussi.</p>" }, ["s1", "s2"]);
    expect(seen).toEqual({ count: 3, first: "s2" });
  });
});
