// @vitest-environment happy-dom
// Chronologie par intrigue : présence des intrigues, personnages et lieux dans les scènes du plan.

import { beforeEach, describe, expect, it } from "vitest";
import { timeline } from "../timeline";
import { mentionHtml } from "../mentions";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { EMPTY_PLAN } from "../plan";
import type { CardData } from "../types";

const card = (id: string, type: CardData["type"], title: string, html = ""): CardData => ({ id, type, title, html });

describe("lignes de la chronologie", () => {
  const cards = [
    card("s1", "scene", "Arrivée", `<p>Avec ${mentionHtml("p2", "Yann")}.</p>`),
    card("s2", "scene", "Le journal", "<p>Notes : le Phare, la nuit.</p>"),
    card("s3", "scene", "Tempête"),
    card("t1", "theme", "Enquête"),
    card("t2", "theme", "Deuil"),
    card("t3", "theme", ""),
    card("p1", "personnage", "Inès Morvan"),
    card("p2", "personnage", "Yann"),
    card("l1", "lieu", "Phare"),
    card("i1", "idee", "Idée"),
  ];
  const links = [{ source: "t1", target: "s1" }, { source: "s3", target: "t1" }, { source: "p1", target: "s2" }, { source: "p1", target: "l1" }];
  const manuscript = { s1: "<p>Inès descend du bateau.</p>", s3: "<p>Yann ferme le phare.</p>" };
  const groups = timeline(cards, links, manuscript, ["s1", "s2", "s3"], "fr");
  const row = (id: string) => groups.flatMap((g) => g.rows).find((r) => r.card.id === id)!;

  it("intrigues d'abord, puis personnages et lieux ; ni idées ni cartes sans titre", () => {
    expect(groups.map((g) => g.type)).toEqual(["theme", "personnage", "lieu"]);
    expect(groups[0].rows.map((r) => r.card.title)).toEqual(["Enquête", "Deuil"]);
  });

  it("relié par un fil, dans un sens ou dans l'autre", () => {
    expect(row("t1")).toMatchObject({ cells: ["linked", "none", "linked"], count: 2 });
    expect(row("t2")).toMatchObject({ cells: ["none", "none", "none"], count: 0 });
  });

  it("cité : texte du manuscrit, mention @, notes de la carte ; un fil l'emporte", () => {
    expect(row("p1").cells).toEqual(["cited", "linked", "none"]);
    expect(row("p2").cells).toEqual(["cited", "none", "cited"]);
    expect(row("l1").cells).toEqual(["none", "cited", "cited"]);
  });

  it("les plus présents en haut", () => {
    expect(groups[1].rows.map((r) => r.card.id)).toEqual(["p1", "p2"]);
    expect(timeline(cards, links, manuscript, [], "fr").flatMap((g) => g.rows).every((r) => r.count === 0)).toBe(true);
  });
});

describe("tirer ou retirer un fil depuis la chronologie", () => {
  const state = () => useCosmos.getState();
  beforeEach(async () => {
    localStorage.clear();
    useSettings.setState({ lang: "fr" });
    useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, plan: EMPTY_PLAN, manuscript: {}, lastFiles: {}, past: [], future: [] });
    await state().start();
    await state().createProject({ title: "Kerlaouen", kind: "roman" });
  });

  it("une case vide tire un fil, une case reliée le retire, et tout s'annule", () => {
    const scene = state().addTitledCard("scene", "Arrivée");
    const theme = state().addTitledCard("theme", "Enquête");
    state().toggleLink(scene, theme);
    expect(state().edges).toMatchObject([{ source: scene, target: theme, label: "" }]);
    state().toggleLink(theme, scene);
    expect(state().edges).toEqual([]);
    state().undo();
    expect(state().edges).toHaveLength(1);
    state().undo();
    expect(state().edges).toHaveLength(0);
  });
});
