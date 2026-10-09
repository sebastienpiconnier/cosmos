// @vitest-environment happy-dom
// Cartes Source et zone Recherche du canevas.

import { beforeEach, describe, expect, it } from "vitest";
import { newResearchBox, pageInfo, researchSpot, today } from "../research";
import { clipFromText } from "../clip";
import { sourceUrl } from "../character";
import { cardToFile, fileToCard } from "../storage/markdown";
import { EMPTY_PLAN } from "../plan";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { serialize, deserialize } from "../storage";

describe("zone Recherche, fonctions pures", () => {
  it("un cadre neuf à droite de tout, des cases de gauche à droite, le cadre grandit quand il est plein", () => {
    expect(newResearchBox([])).toMatchObject({ x: 0, y: 0 });
    const box = newResearchBox([{ x: 0, y: 50, width: 240, height: 150 }, { x: 600, y: 300, width: 240, height: 150 }]);
    expect(box).toMatchObject({ x: 1000, y: 50 });
    const first = researchSpot(box, []);
    expect(first.spot).toEqual({ x: box.x + 32, y: box.y + 64 });
    const cards = [0, 1, 2, 3, 4, 5].map((i) => ({ x: box.x + 32 + (i % 3) * 264, y: box.y + 64 + Math.floor(i / 3) * 174, width: 240, height: 150 }));
    const full = researchSpot(box, cards);
    expect(full.spot.y).toBe(box.y + 64 + 2 * 174);
    expect(full.frame.height).toBeGreaterThan(box.height);
    expect(today("fr", new Date(2026, 9, 9))).toBe("9 octobre 2026");
  });

  it("ce que dit une page d'elle-même", () => {
    const html = '<html><head><title>Phare — Wikipédia</title><meta property="og:title" content="Phare"><meta property="og:site_name" content="Wikipédia"><meta name="author" content="Collectif"><meta property="article:published_time" content="2024-03-02T10:00:00Z"></head></html>';
    expect(pageInfo(html)).toEqual({ title: "Phare", site: "Wikipédia", author: "Collectif", published: "2024-03-02" });
    expect(pageInfo("<title> Un   titre </title>").title).toBe("Un titre");
  });

  it("une source a son adresse dans sa fiche, relue depuis le fichier", () => {
    expect(clipFromText("https://www.gallica.bnf.fr/x")).toEqual({ title: "gallica.bnf.fr", url: "https://www.gallica.bnf.fr/x", markdown: "" });
    const card = { id: "s", type: "source" as const, title: "Phare", html: "<blockquote><p>Extrait</p></blockquote>", fiche: { url: "https://x.fr/a", consulte: "9 octobre 2026" } };
    expect(sourceUrl(card)).toBe("https://x.fr/a");
    expect(sourceUrl({ type: "source", fiche: { url: "javascript:alert(1)" } })).toBeNull();
    expect(sourceUrl({ type: "idee", fiche: { url: "https://x.fr" } })).toBeNull();
    expect(fileToCard(cardToFile(card))).toMatchObject({ type: "source", fiche: card.fiche });
  });
});

describe("zone Recherche dans le projet", () => {
  const state = () => useCosmos.getState();
  beforeEach(async () => {
    localStorage.clear();
    useSettings.setState({ lang: "fr" });
    useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, plan: EMPTY_PLAN, manuscript: {}, lastFiles: {}, past: [], future: [] });
    await state().start();
    await state().createProject({ title: "K", kind: "roman" });
  });

  it("un lien collé : une source dans le cadre Recherche, créé une fois, enregistré, annulable", () => {
    state().addTitledCard("personnage", "Inès");
    const a = state().addResearchClip("https://fr.wikipedia.org/wiki/Phare")!;
    const b = state().addResearchClip("Le phare de Kerlaouen fut éteint en 1952.")!;
    const research = state().frames.filter((f) => f.data.kind === "research");
    expect(research).toHaveLength(1);
    expect(research[0].data.title).toBe("Sources");
    const card = (id: string) => state().nodes.find((n) => n.id === id)!;
    expect(card(a).data).toMatchObject({ type: "source", title: "fr.wikipedia.org", fiche: { url: "https://fr.wikipedia.org/wiki/Phare" } });
    expect(card(b).data.html).toContain("<blockquote>");
    // Dans le cadre, l'une à côté de l'autre.
    const f = research[0];
    for (const id of [a, b]) {
      const p = card(id).position;
      expect(p.x).toBeGreaterThanOrEqual(f.position.x);
      expect(p.y).toBeGreaterThanOrEqual(f.position.y);
    }
    expect(card(a).position.y).toBe(card(b).position.y);
    // Le cadre garde sa nature dans cosmos.json.
    const files = serialize(deserialize(serialize({ meta: { version: 1, title: "K", layout: [], links: [], frames: [{ id: "r", title: "Recherche", x: 0, y: 0, width: 300, height: 200, kind: "research" }] }, cards: [], screenplay: null }))!);
    expect(JSON.parse(files["cosmos.json"]).frames[0].kind).toBe("research");
    state().undo();
    expect(state().nodes.some((n) => n.id === b)).toBe(false);
  });

  it("« Organiser le canevas » laisse la zone Recherche et ses sources en place", () => {
    state().addTitledCard("personnage", "Inès");
    const a = state().addResearchClip("https://x.fr/a")!;
    const before = state().nodes.find((n) => n.id === a)!.position;
    state().organizeCanvas();
    expect(state().frames.some((f) => f.data.kind === "research")).toBe(true);
    expect(state().nodes.find((n) => n.id === a)!.position).toEqual(before);
  });
});
