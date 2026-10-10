// @vitest-environment happy-dom
// Photos libres (Openverse, Pixabay, Unsplash) : réponses filtrées, erreurs, photo choisie créditée dans la fiche.

import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchImage = vi.fn(async (url: string) => (url.includes("refuse") ? null : { name: "page.jpg", data: new Uint8Array([255, 216, 255, 0]) }));
vi.mock("../web", () => ({ readPage: vi.fn(), fetchImage: (url: string) => fetchImage(url) }));

import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { storage } from "../storage";
import { licenseName, parseOpenverse, parsePixabay, parseUnsplash, searchPhotos, statusError } from "../imageSources";

const state = () => useCosmos.getState();

const openverse = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: "Phare de Kerbel",
  url: `https://live.staticflickr.com/${id}.jpg`,
  thumbnail: `https://api.openverse.org/v1/images/${id}/thumb/`,
  foreign_landing_url: `https://www.flickr.com/photos/x/${id}`,
  creator: "Anne Martin",
  license: "by-sa",
  license_version: "2.0",
  source: "flickr",
  ...extra,
});

beforeEach(async () => {
  localStorage.clear();
  fetchImage.mockClear();
  useSettings.setState({ lang: "fr", photos: { source: "openverse", keys: { pixabay: "", unsplash: "" } } });
  useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, paperChosen: false, lastFiles: {}, past: [], future: [], trash: [], trashNotice: null });
  await state().start();
  await state().createProject({ title: "Essai", kind: "roman" });
});

describe("lecture des réponses", () => {
  it("Openverse : vignette par le proxy d'Openverse seulement, licence et source lisibles", () => {
    const page = parseOpenverse({
      result_count: 240,
      page: 1,
      page_count: 12,
      results: [
        openverse("a1"),
        openverse("a2", { thumbnail: "https://evil.example/t.jpg" }),
        openverse("a3", { url: "javascript:alert(1)", foreign_landing_url: "http://x.org", license: "cc0", license_version: "1.0", source: "" }),
        { id: 4 },
        null,
      ],
    });
    expect(page.photos.map((p) => p.id)).toEqual(["a1", "a3"]);
    expect(page.photos[0]).toMatchObject({ author: "Anne Martin", credit: "Flickr via Openverse, CC BY-SA 2.0", downloads: ["https://live.staticflickr.com/a1.jpg", "https://api.openverse.org/v1/images/a1/thumb/"] });
    expect(page.photos[1]).toMatchObject({ page: "https://openverse.org/image/a3", credit: "Openverse, CC0 1.0", downloads: ["https://api.openverse.org/v1/images/a3/thumb/"] });
    expect(page).toMatchObject({ total: 240, more: true });
    expect(parseOpenverse("n'importe quoi")).toEqual({ photos: [], total: 0, more: false });
    expect(licenseName("pdm", "1.0")).toBe("Public Domain Mark");
    expect(licenseName("<b>", "1")).toBe("");
  });

  it("Pixabay : adresses de pixabay.com seulement, page suivante d'après totalHits", () => {
    const hit = (id: number, extra: Record<string, unknown> = {}) => ({
      id,
      pageURL: `https://pixabay.com/photos/phare-${id}/`,
      tags: "phare, mer, tempête",
      webformatURL: `https://pixabay.com/get/${id}_640.jpg`,
      largeImageURL: `https://pixabay.com/get/${id}_1280.jpg`,
      user: "marin",
      ...extra,
    });
    const page = parsePixabay({ total: 5000, totalHits: 500, hits: [hit(1), hit(2, { webformatURL: "https://evil.example/x.jpg", previewURL: "http://cdn.pixabay.com/p.jpg" }), hit(3, { largeImageURL: "https://evil.example/l.jpg" })] }, 1);
    expect(page.photos.map((p) => p.id)).toEqual(["1", "3"]);
    expect(page.photos[0]).toMatchObject({ author: "marin", alt: "phare, mer, tempête", credit: "Pixabay", downloads: ["https://pixabay.com/get/1_1280.jpg", "https://pixabay.com/get/1_640.jpg"] });
    expect(page.photos[1].downloads).toEqual(["https://pixabay.com/get/3_640.jpg"]);
    expect(page.more).toBe(true);
    expect(parsePixabay({ totalHits: 40, hits: [] }, 2).more).toBe(false);
  });

  it("Unsplash : images.unsplash.com, lien crédité vers Unsplash, adresse de suivi", () => {
    const page = parseUnsplash(
      {
        total: 90,
        total_pages: 5,
        results: [
          {
            id: "Xy1",
            alt_description: "un phare la nuit",
            urls: { small: "https://images.unsplash.com/photo-1?w=400", regular: "https://images.unsplash.com/photo-1?w=1080" },
            links: { html: "https://unsplash.com/photos/Xy1", download_location: "https://api.unsplash.com/photos/Xy1/download?ixid=a" },
            user: { name: "Léa Roux" },
          },
          { id: "Zz", urls: { small: "https://evil.example/s.jpg" } },
          { id: "Tr", urls: { small: "https://images.unsplash.com/photo-2" }, links: { download_location: "https://evil.example/track" } },
        ],
      },
      5,
    );
    expect(page.photos.map((p) => p.id)).toEqual(["Xy1", "Tr"]);
    expect(page.photos[0]).toMatchObject({ author: "Léa Roux", credit: "Unsplash", page: "https://unsplash.com/photos/Xy1?utm_source=cosmos&utm_medium=referral", track: "https://api.unsplash.com/photos/Xy1/download?ixid=a" });
    expect(page.photos[1].track).toBeUndefined();
    expect(page.more).toBe(false);
  });

  it("erreurs : clé refusée, limite atteinte, service absent", () => {
    expect(statusError("pixabay", 200, null)).toBeNull();
    expect(statusError("pixabay", 400, null)).toBe("key");
    expect(statusError("unsplash", 401, null)).toBe("key");
    expect(statusError("unsplash", 403, "0")).toBe("limit");
    expect(statusError("openverse", 429, null)).toBe("limit");
    expect(statusError("openverse", 500, null)).toBe("network");
  });

  it("recherche : Openverse sans clé, Unsplash avec la clé en Client-ID", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      calls.push({ url: String(url), headers: (init?.headers ?? {}) as Record<string, string> });
      return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });
    });
    await searchPhotos("openverse", "", "phare", 1, "fr");
    await searchPhotos("unsplash", "cle-u", "phare", 2, "fr");
    expect(calls[0].url).toMatch(/^https:\/\/api\.openverse\.org\/v1\/images\/\?q=phare&page=1&page_size=20/);
    expect(calls[0].headers.Authorization).toBeUndefined();
    expect(calls[1].url).toMatch(/^https:\/\/api\.unsplash\.com\/search\/photos\?query=phare&page=2/);
    expect(calls[1].headers.Authorization).toBe("Client-ID cle-u");
    spy.mockRestore();
  });
});

describe("photo choisie", () => {
  it("devient une carte Image créditée (auteur, page, source et licence)", async () => {
    state().openPhotos({ kind: "canvas" });
    expect(state().dialog).toBe("photos");
    const [p] = parseOpenverse({ results: [openverse("b7", { url: "https://refuse.example/b7.jpg" })] }).photos;
    expect(await state().addPhoto(p)).toBe(true);
    // L'image d'origine refusée, la vignette d'Openverse a pris le relais.
    expect(fetchImage.mock.calls.map((c) => c[0])).toEqual(["https://refuse.example/b7.jpg", "https://api.openverse.org/v1/images/b7/thumb/"]);
    const card = state().nodes[state().nodes.length - 1].data;
    expect(card).toMatchObject({ type: "image", title: "Phare de Kerbel", fiche: { url: "https://www.flickr.com/photos/x/b7", auteur: "Anne Martin", publication: "Flickr via Openverse, CC BY-SA 2.0" } });
    expect(await storage.mediaUrl(card.image!)).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("dans la galerie d'une fiche : la photo s'y ajoute", async () => {
    const id = state().addCard({ x: 0, y: 0 }, "lieu");
    state().openPhotos({ kind: "gallery", id });
    const [p] = parseOpenverse({ results: [openverse("b8")] }).photos;
    expect(await state().addPhoto(p)).toBe(true);
    expect(state().nodes.find((n) => n.id === id)!.data.image).toBeTruthy();
  });

  it("aucune adresse ne répond : rien n'est créé", async () => {
    state().openPhotos({ kind: "canvas" });
    const before = state().nodes.length;
    const p = { ...parseOpenverse({ results: [openverse("b9")] }).photos[0], downloads: ["https://refuse.example/1.jpg"] };
    expect(await state().addPhoto(p)).toBe(false);
    expect(state().nodes.length).toBe(before);
  });
});

describe("réglages", () => {
  it("clés et source de l'appareil, relues avec prudence", () => {
    useSettings.getState().setPhotoKey("pixabay", "  abc  ");
    useSettings.getState().setPhotoSource("unsplash");
    expect(useSettings.getState().photos).toEqual({ source: "unsplash", keys: { pixabay: "abc", unsplash: "" } });
  });
});
