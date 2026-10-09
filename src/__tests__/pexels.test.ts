// @vitest-environment happy-dom
// Photos Pexels : réponse filtrée (adresses pexels.com seulement), photo choisie créditée dans la fiche.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../web", () => ({
  readPage: vi.fn(),
  fetchImage: vi.fn(async () => ({ name: "page.jpg", data: new Uint8Array([255, 216, 255, 0]) })),
}));

import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { storage } from "../storage";
import { parsePexels, pexelsLocale } from "../pexels";

const state = () => useCosmos.getState();
const photo = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  width: 4000,
  height: 3000,
  url: `https://www.pexels.com/photo/phare-${id}/`,
  photographer: "Anne Martin",
  photographer_url: "https://www.pexels.com/@anne",
  alt: "Un phare sous l'orage",
  src: { medium: `https://images.pexels.com/photos/${id}/m.jpeg`, large: `https://images.pexels.com/photos/${id}/l.jpeg` },
  ...extra,
});

beforeEach(async () => {
  localStorage.clear();
  useSettings.setState({ lang: "fr" });
  useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, paperChosen: false, lastFiles: {}, past: [], future: [], trash: [], trashNotice: null });
  await state().start();
  await state().createProject({ title: "Essai", kind: "roman" });
});

describe("Pexels", () => {
  it("ne garde que des photos complètes, aux adresses de pexels.com", () => {
    const page = parsePexels({
      total_results: 120,
      next_page: "https://api.pexels.com/v1/search/?page=2",
      photos: [
        photo(1),
        photo(2, { src: { medium: "https://evil.example/m.jpg", large: "https://images.pexels.com/l.jpg" } }),
        photo(3, { url: "javascript:alert(1)", photographer_url: "http://www.pexels.com/@x" }),
        { id: "4" },
        null,
      ],
    });
    expect(page.photos.map((p) => p.id)).toEqual([1, 3]);
    expect(page.photos[1]).toMatchObject({ page: "https://www.pexels.com/photo/3/", photographerUrl: "" });
    expect(page).toMatchObject({ total: 120, more: true });
    expect(parsePexels("n'importe quoi")).toEqual({ photos: [], total: 0, more: false });
    expect(pexelsLocale("fr")).toBe("fr-FR");
    expect(pexelsLocale("en")).toBe("en-US");
  });

  it("la photo choisie devient une carte Image créditée (photographe, page, Pexels)", async () => {
    state().openPexels({ kind: "canvas" });
    expect(state().dialog).toBe("pexels");
    const [p] = parsePexels({ photos: [photo(7)] }).photos;
    expect(await state().addPexelsPhoto(p)).toBe(true);
    const card = state().nodes[state().nodes.length - 1].data;
    expect(card).toMatchObject({ type: "image", title: "Un phare sous l'orage", fiche: { url: "https://www.pexels.com/photo/phare-7/", auteur: "Anne Martin", publication: "Pexels" } });
    expect(await storage.mediaUrl(card.image!)).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("dans la galerie d'une fiche : la photo s'y ajoute", async () => {
    const id = state().addCard({ x: 0, y: 0 }, "lieu");
    state().openPexels({ kind: "gallery", id });
    const [p] = parsePexels({ photos: [photo(8)] }).photos;
    expect(await state().addPexelsPhoto(p)).toBe(true);
    expect(state().nodes.find((n) => n.id === id)!.data.image).toBeTruthy();
  });
});
