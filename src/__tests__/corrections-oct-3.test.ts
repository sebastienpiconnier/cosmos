// @vitest-environment happy-dom
// Corrections d'octobre 2026, troisième série : rubriques de la Bible, fiche Intrigue, galerie de photos,
// description d'un lieu par une IA qui lit les images.

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SECTIONS, moveSection, readSections, sectionOrder, toggleSection, visibleSections } from "../bibleSections";
import { BIBLE_ORDER } from "../types";
import { cardToFile, fileToCard } from "../storage/markdown";
import { readFiche, sheetFields } from "../character";
import { chatRequest, type AiConfig } from "../ai/providers";
import { describePlacePrompt, parseNotes } from "../ai/tasks";
import { fitWithin } from "../ai/image";
import { EMPTY_PLAN } from "../plan";
import { useCosmos } from "../store";
import { useSettings } from "../settings";

describe("rubriques de la Bible", () => {
  it("toutes par défaut ; masquer, déplacer, relire", () => {
    expect(visibleSections(DEFAULT_SECTIONS)).toEqual(BIBLE_ORDER);
    let prefs = toggleSection(DEFAULT_SECTIONS, "question");
    expect(visibleSections(prefs)).not.toContain("question");
    prefs = moveSection(prefs, "lieu", "up");
    expect(sectionOrder(prefs).slice(0, 3)).toEqual(["personnage", "lieu", "intrigue"]);
    expect(moveSection(prefs, "personnage", "up")).toBe(prefs);
    expect(readSections({ order: ["lieu", "inconnu", "lieu"], hidden: ["idee", 3] })).toEqual({ order: ["lieu"], hidden: ["idee"] });
    // Un type que l'ordre enregistré ignore (nouveau type) se range près de sa place par défaut.
    expect(sectionOrder({ order: ["lieu", "personnage"], hidden: [] })[0]).toBe("lieu");
    expect(sectionOrder({ order: ["lieu", "personnage"], hidden: [] })).toHaveLength(BIBLE_ORDER.length);
  });
});

describe("fiche Intrigue et galerie dans le fichier", () => {
  it("champs propres au type, photos en simples noms de fichiers", () => {
    expect(sheetFields("intrigue")).toContain("question");
    expect(readFiche({ question: "Retrouvera-t-elle son frère ?", age: "34" }, "intrigue")).toEqual({ question: "Retrouvera-t-elle son frère ?" });
    const file = cardToFile({ id: "l", type: "lieu", title: "Phare", html: "", image: "a.jpg", images: ["b.png", "c.webp"], fiche: { ambiance: "Vent" } });
    expect(file).toContain('images: ["b.png","c.webp"]');
    const back = fileToCard(file)!;
    expect(back).toMatchObject({ image: "a.jpg", images: ["b.png", "c.webp"], fiche: { ambiance: "Vent" } });
    expect(fileToCard('---\nid: l\ntype: lieu\ntitle: ""\nimages: ["../x.png","ok.jpg"]\n---\n')?.images).toEqual(["ok.jpg"]);
  });
});

describe("galerie dans le projet", () => {
  const state = () => useCosmos.getState();
  beforeEach(async () => {
    localStorage.clear();
    useSettings.setState({ lang: "fr" });
    useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, plan: EMPTY_PLAN, manuscript: {}, lastFiles: {}, past: [], future: [] });
    await state().start();
    await state().createProject({ title: "K", kind: "roman" });
  });
  const png = (name: string) => ({ name, data: new Uint8Array([137, 80, 78, 71]) });

  it("ajouter, promouvoir en portrait, retirer, annuler", async () => {
    const id = state().addTitledCard("personnage", "Inès");
    expect(await state().addGalleryImages(id, [png("a.png"), png("b.png"), png("notes.txt")])).toBe(2);
    const card = () => state().nodes.find((n) => n.id === id)!.data;
    // Pas encore de portrait : la première photo le devient.
    expect(card().image).toBeTruthy();
    expect(card().images).toHaveLength(1);
    const [extra] = card().images!;
    const main = card().image!;
    state().useAsMainImage(id, extra);
    expect(card()).toMatchObject({ image: extra, images: [main] });
    state().removeGalleryImage(id, main);
    expect(card().images).toBeUndefined();
    state().undo();
    expect(card().images).toEqual([main]);
  });
});

describe("décrire un lieu d'après une photo", () => {
  const image = { mime: "image/jpeg", data: "QUJD" };
  const config = (provider: AiConfig["provider"]): AiConfig => ({ provider, key: "k", model: "m", url: "" });

  it("l'image part dans le format de chaque service", () => {
    const anthropic = JSON.parse(chatRequest(config("anthropic"), "s", "u", { images: [image] }).body!);
    expect(anthropic.messages[0].content[0]).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "QUJD" } });
    const openai = JSON.parse(chatRequest(config("lmstudio"), "s", "u", { images: [image] }).body!);
    expect(openai.messages[1].content[1]).toEqual({ type: "image_url", image_url: { url: "data:image/jpeg;base64,QUJD" } });
    const ollama = JSON.parse(chatRequest(config("ollama"), "s", "u", { images: [image] }).body!);
    expect(ollama.messages[1].images).toEqual(["QUJD"]);
    // Sans image, rien ne change.
    expect(JSON.parse(chatRequest(config("anthropic"), "s", "u").body!).messages[0].content).toBe("u");
  });

  it("consigne : des notes sur ce qui est visible, jamais d'histoire inventée", () => {
    const prompt = describePlacePrompt({ id: "l", type: "lieu", title: "Phare", html: "<p>Îlot.</p>" }, "fr");
    expect(prompt.system).toContain("Do not invent events");
    expect(JSON.parse(prompt.user)).toEqual({ place: "Phare", notes: "Îlot." });
    expect(parseNotes("Voici :\n- **Lumière** rasante\n2. Granit gris\n\n• Odeur d'iode")).toEqual(["Voici :", "Lumière rasante", "Granit gris", "Odeur d'iode"]);
    expect(fitWithin(4000, 3000)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 });
  });
});
