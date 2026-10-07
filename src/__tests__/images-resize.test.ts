// @vitest-environment happy-dom
// Images des cartes (dossier medias/) et largeur des cartes.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { cardPath, storage } from "../storage";
import { cardToFile, fileToCard } from "../storage/markdown";
import { clampCardWidth, imageExtension, isMediaName, mimeOf } from "../media";

const state = () => useCosmos.getState();
const node = (id: string) => state().nodes.find((n) => n.id === id)!;
const png = { name: "Phare de nuit.PNG", data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) };

beforeEach(async () => {
  localStorage.clear();
  useSettings.setState({ lang: "fr" });
  useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, paperChosen: false, lastFiles: {}, past: [], future: [] });
  await state().start();
  await state().createProject({ title: "Essai", kind: "roman" });
});
afterEach(() => {
  vi.restoreAllMocks();
  useSettings.setState({ lang: "en" });
});

describe("noms de fichier", () => {
  it("formats d'image reconnus, sans tenir compte de la casse", () => {
    expect(imageExtension("phare.JPG")).toBe("jpg");
    expect(imageExtension("a.b.webp")).toBe("webp");
    expect(imageExtension("notes.txt")).toBeNull();
    expect(imageExtension("sans-extension")).toBeNull();
    expect(mimeOf("x.jpeg")).toBe("image/jpeg");
  });

  it("un nom lu sur disque doit être un simple nom de fichier image", () => {
    expect(isMediaName("k3x9a7bq2m.jpg")).toBe(true);
    for (const bad of ["../secret.png", "medias/a.png", "a/b.png", "..png", "a..png", "a.txt", "a b.png", "", undefined, 12]) {
      expect(isMediaName(bad), String(bad)).toBe(false);
    }
  });
});

describe("fichier d'une carte", () => {
  it("le champ image est écrit, relu, et absent quand la carte n'a pas d'image", () => {
    const card = { id: "a", type: "lieu" as const, title: "Phare", html: "", image: "k3x9.jpg" };
    const text = cardToFile(card);
    expect(text).toBe('---\nid: a\ntype: lieu\ntitle: "Phare"\nimage: k3x9.jpg\n---\n\n');
    expect(fileToCard(text)).toEqual(card);
    expect(cardToFile({ ...card, image: undefined })).not.toContain("image:");
  });

  it("un fichier piégé ne peut pas désigner un autre fichier du disque", () => {
    const card = fileToCard('---\nid: a\ntype: lieu\ntitle: "Phare"\nimage: ../../cosmos.json\n---\n');
    expect(card).toEqual({ id: "a", type: "lieu", title: "Phare", html: "" });
  });
});

describe("image d'une carte", () => {
  it("elle est copiée dans medias/ sous un nom neuf, et enregistrée avec la carte", async () => {
    const id = state().addCard({ x: 0, y: 0 }, "lieu");
    expect(await state().setCardImage(id, png)).toBe(true);

    const name = node(id).data.image!;
    expect(name).toMatch(/^[A-Za-z0-9_-]{10}\.png$/);
    expect(await storage.mediaUrl(name)).toBe("data:image/png;base64,iVBORw0KGgo=");

    await state().save();
    const files = (await storage.readAll())!;
    expect(files[cardPath(id)]).toContain(`image: ${name}`);
    // Les images ne font pas partie des fichiers texte : enregistrer ne les efface pas.
    await state().save();
    expect(await storage.mediaUrl(name)).not.toBeNull();
  });

  it("le projet relu retrouve l'image", async () => {
    const id = state().addCard({ x: 0, y: 0 });
    await state().setCardImage(id, png);
    const name = node(id).data.image;
    await state().closeProject();
    await state().openProject(state().projects[0].id);
    expect(node(id).data.image).toBe(name);
  });

  it("ce qui n'est pas une image est refusé", async () => {
    const id = state().addCard({ x: 0, y: 0 });
    expect(await state().setCardImage(id, { name: "notes.txt", data: new Uint8Array([1]) })).toBe(false);
    expect(await state().setCardImage("inconnue", png)).toBe(false);
    expect(node(id).data.image).toBeUndefined();
  });

  it("la copie échoue (disque plein) : la carte reste sans image", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(storage, "writeMedia").mockRejectedValue(new Error("disque plein"));
    const id = state().addCard({ x: 0, y: 0 });
    expect(await state().setCardImage(id, png)).toBe(false);
    expect(node(id).data.image).toBeUndefined();
  });

  it("retirer l'image, puis annuler : elle revient (le fichier n'a pas été supprimé)", async () => {
    const id = state().addCard({ x: 0, y: 0 });
    await state().setCardImage(id, png);
    const name = node(id).data.image!;
    state().updateCard(id, { image: undefined });
    expect(node(id).data.image).toBeUndefined();
    state().undo();
    expect(node(id).data.image).toBe(name);
    expect(await storage.mediaUrl(name)).not.toBeNull();
  });

  it("image déposée sur le canevas : une nouvelle carte la porte, sans prendre le focus", async () => {
    const id = await state().addImageCard({ x: 300, y: 200 }, png);
    expect(id).not.toBeNull();
    expect(node(id!).data).toMatchObject({ type: "idee", title: "" });
    expect(node(id!).data.image).toMatch(/\.png$/);
    expect(state().pendingFocusId).toBeNull();
  });

  it("dépôt qui échoue : aucune carte vide n'est laissée", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(storage, "writeMedia").mockRejectedValue(new Error("disque plein"));
    expect(await state().addImageCard({ x: 0, y: 0 }, png)).toBeNull();
    expect(state().nodes).toEqual([]);
    expect(await state().addImageCard({ x: 0, y: 0 }, { name: "notes.txt", data: new Uint8Array([1]) })).toBeNull();
    expect(state().nodes).toEqual([]);
  });

  it("bouton de la carte : l'image choisie est posée ; annuler le choix ne change rien", async () => {
    const id = state().addCard({ x: 0, y: 0 });
    vi.spyOn(storage, "pickImage").mockResolvedValueOnce(null);
    await state().pickCardImage(id);
    expect(node(id).data.image).toBeUndefined();
    vi.spyOn(storage, "pickImage").mockResolvedValueOnce(png);
    await state().pickCardImage(id);
    expect(node(id).data.image).toMatch(/\.png$/);
  });
});

describe("largeur d'une carte", () => {
  it("bornée entre 180 et 640", () => {
    expect(clampCardWidth(50)).toBe(180);
    expect(clampCardWidth(301.6)).toBe(302);
    expect(clampCardWidth(5000)).toBe(640);
  });

  it("au clavier : par pas, dans les bornes, et enregistrée", async () => {
    const id = state().addCard({ x: 0, y: 0 });
    state().resizeCard(id, 40);
    expect(node(id).style?.width).toBe(280);
    for (let i = 0; i < 20; i++) state().resizeCard(id, 40);
    expect(node(id).style?.width).toBe(640);
    for (let i = 0; i < 30; i++) state().resizeCard(id, -40);
    expect(node(id).style?.width).toBe(180);

    state().resizeCard(id, 120);
    await state().save();
    expect(JSON.parse((await storage.readAll())!["cosmos.json"]).layout[0].width).toBe(300);
  });

  it("à la souris : la largeur est retenue, la hauteur reste libre", () => {
    const id = state().addCard({ x: 0, y: 0 });
    state().onNodesChange([{ id, type: "dimensions", dimensions: { width: 333.4, height: 400 }, resizing: true, setAttributes: true }]);
    const n = node(id);
    expect(n.style?.width).toBe(333);
    expect(n.width).toBeUndefined();
    expect(n.height).toBeUndefined();
    expect(state().status).toBe("modifie");
    state().undo();
    expect(node(id).style?.width).toBe(240);
  });

  it("la mesure d'une carte par React Flow ne change pas sa largeur", () => {
    const id = state().addCard({ x: 0, y: 0 });
    state().onNodesChange([{ id, type: "dimensions", dimensions: { width: 240, height: 152 } }]);
    expect(node(id).style?.width).toBe(240);
  });
});
