// @vitest-environment happy-dom
// Cartes Source et zone Recherche du canevas.

import { beforeEach, describe, expect, it, vi } from "vitest";

// Pas de réseau dans les tests : la page d'une source ne se lit pas.
vi.mock("../web", () => ({ readPage: async () => { throw new Error("hors ligne"); }, fetchImage: async () => null }));
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
    expect(pageInfo(html)).toEqual({ title: "Phare", site: "Wikipédia", author: "Collectif", published: "2024-03-02", image: "" });
    expect(pageInfo('<meta property="og:image" content="/img/phare.jpg">', "https://x.fr/a/b").image).toBe("https://x.fr/img/phare.jpg");
    expect(pageInfo('<meta property="og:image" content="javascript:alert(1)">', "https://x.fr/").image).toBe("");
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

  it("un lien collé : une seule carte, là où l'on colle, sans cadre imposé ; annulable", () => {
    state().addTitledCard("personnage", "Inès");
    const a = state().addResearchClip("https://fr.wikipedia.org/wiki/Phare", { x: 1000, y: 600 })!;
    // Le même geste reçu deux fois (collage et dépôt) ne fait pas de deuxième carte.
    expect(state().addResearchClip("https://fr.wikipedia.org/wiki/Phare", { x: 1000, y: 600 })).toBeNull();
    const b = state().addResearchClip("Le phare de Kerlaouen fut éteint en 1952.")!;
    expect(state().frames).toHaveLength(0);
    const card = (id: string) => state().nodes.find((n) => n.id === id)!;
    expect(card(a).data).toMatchObject({ type: "source", title: "fr.wikipedia.org", fiche: { url: "https://fr.wikipedia.org/wiki/Phare" } });
    expect(card(a).position).toEqual({ x: 980, y: 580 });
    expect(card(b).data.html).toContain("<blockquote>");
    expect(state().nodes.filter((n) => n.data.type === "source")).toHaveLength(2);
    // Un ancien cadre Recherche garde sa nature dans cosmos.json.
    const files = serialize(deserialize(serialize({ meta: { version: 1, title: "K", layout: [], links: [], frames: [{ id: "r", title: "Recherche", x: 0, y: 0, width: 300, height: 200, kind: "research" }] }, cards: [], screenplay: null }))!);
    expect(JSON.parse(files["cosmos.json"]).frames[0].kind).toBe("research");
    state().undo();
    expect(state().nodes.some((n) => n.id === b)).toBe(false);
  });

  it("« Organiser le canevas » range liens, images et extraits dans un cadre Recherche, comme les autres types", () => {
    state().addTitledCard("personnage", "Inès");
    const a = state().addResearchClip("https://x.fr/a")!;
    const b = state().addTitledCard("source", "Archives");
    state().organizeCanvas();
    const zone = state().frames.find((f) => f.data.title === "Recherche")!;
    expect(zone).toBeDefined();
    for (const id of [a, b]) {
      const p = state().nodes.find((n) => n.id === id)!.position;
      expect(p.x).toBeGreaterThanOrEqual(zone.position.x);
      expect(p.y).toBeGreaterThanOrEqual(zone.position.y);
      expect(p.x).toBeLessThan(zone.position.x + (zone.width ?? 0));
    }
  });

  it("un lien collé deux fois ne fait qu'une source ; la ponctuation qui le suit est ignorée", () => {
    const a = state().addResearchClip("https://x.fr/page'")!;
    const b = state().addResearchClip("https://x.fr/page")!;
    expect(a).toBe(b);
    expect(state().nodes.filter((n) => n.data.type === "source")).toHaveLength(1);
    expect(state().nodes.find((n) => n.id === a)!.data.fiche?.url).toBe("https://x.fr/page");
  });
});

describe("cartes de la zone Recherche (recette d'octobre, suite)", () => {
  it("lien, image ou extrait selon ce qu'on a collé ; l'ancien titre de la zone est remplacé", async () => {
    const { sourceKind, renamedZone } = await import("../research");
    expect(sourceKind({ type: "source", fiche: { url: "https://exemple.fr/a" }, image: "a.jpg" })).toBe("lien");
    expect(sourceKind({ type: "source", image: "a.jpg" })).toBe("image");
    expect(sourceKind({ type: "source" })).toBe("extrait");
    expect(sourceKind({ type: "idee", image: "a.jpg" })).toBeNull();
    expect(renamedZone("Sources", ["Sources"], "Recherche")).toBe("Recherche");
    expect(renamedZone("Mes lectures", ["Sources"], "Recherche")).toBe("Mes lectures");
  });
});

describe("un lien et son titre", () => {
  it("« titre, puis adresse » fait une carte Lien, pas un extrait", () => {
    expect(clipFromText("Phare d'Ar-Men, Wikipédia\nhttps://fr.wikipedia.org/wiki/Phare_d%27Ar-Men")).toEqual({
      title: "Phare d'Ar-Men, Wikipédia",
      url: "https://fr.wikipedia.org/wiki/Phare_d%27Ar-Men",
      markdown: "",
    });
    expect(clipFromText("Un passage\nsur deux lignes\nhttps://x.fr")?.url).toBeUndefined();
  });
});
