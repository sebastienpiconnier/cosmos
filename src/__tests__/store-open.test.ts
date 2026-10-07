// @vitest-environment happy-dom
// Ouverture du projet : un dossier illisible ne fige pas l'app, et un projet existant n'est jamais écrasé.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCosmos } from "../store";
import { META_FILE, cardPath, storage, type FileMap } from "../storage";

const KEY = "cosmos:projet-demo";
const state = () => useCosmos.getState();
const disk = (): FileMap => JSON.parse(localStorage.getItem(KEY) ?? "{}");

const existing: FileMap = {
  [META_FILE]: JSON.stringify({ version: 1, title: "Mon vrai roman", layout: [{ id: "a", x: 10, y: 20 }], links: [] }),
  [cardPath("a")]: '---\nid: a\ntype: personnage\ntitle: "Inès Morvan"\n---\n',
};

beforeEach(() => {
  localStorage.clear();
  useCosmos.setState({ loaded: false, openFailed: false, lastFiles: {}, screenplay: null, savedScreenplay: null, nodes: [], edges: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
  storage.canPickFolder = false;
});

describe("dossier du projet illisible", () => {
  it("l'app s'ouvre quand même, prévient l'auteur et oublie le dossier", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(storage, "readAll").mockRejectedValueOnce(new Error("forbidden path: D:\\Projet Cosmos"));
    const forget = vi.spyOn(storage, "forget");

    await state().load();

    expect(state().loaded).toBe(true);
    expect(state().openFailed).toBe(true);
    expect(forget).toHaveBeenCalledOnce();
    // Le projet d'exemple est affiché, mais rien n'est « à enregistrer » : aucun dialogue ne s'ouvre seul.
    expect(state().nodes.length).toBeGreaterThan(0);
    expect(state().status).toBe("enregistre");
  });

  it("le message se ferme, et disparaît dès qu'un projet s'ouvre", async () => {
    useCosmos.setState({ openFailed: true });
    state().dismissOpenFailed();
    expect(state().openFailed).toBe(false);

    useCosmos.setState({ openFailed: true });
    localStorage.setItem(KEY, JSON.stringify(existing));
    await state().openFolder();
    expect(state().openFailed).toBe(false);
    expect(state().title).toBe("Mon vrai roman");
  });

  it("ouvrir un dossier qui échoue à son tour : le message reste, l'app aussi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await state().load();
    vi.spyOn(storage, "readAll").mockRejectedValueOnce(new Error("forbidden path"));
    await state().openFolder();
    expect(state().openFailed).toBe(true);
    expect(state().loaded).toBe(true);
  });
});

describe("enregistrer dans un dossier qui contient déjà un projet", () => {
  it("le projet existant est ouvert, jamais écrasé par le projet d'exemple", async () => {
    await state().load(); // projet d'exemple, pas encore de dossier
    expect(state().title).not.toBe("Mon vrai roman");

    // Ordinateur : l'auteur choisit un dossier au premier enregistrement, et prend celui de son roman.
    storage.canPickFolder = true;
    vi.spyOn(storage, "location").mockReturnValue(null);
    vi.spyOn(storage, "pickFolder").mockImplementation(async () => {
      localStorage.setItem(KEY, JSON.stringify(existing));
      return true;
    });

    await state().save();

    expect(disk()).toEqual(existing);
    expect(state().title).toBe("Mon vrai roman");
    expect(state().nodes.map((n) => n.data.title)).toEqual(["Inès Morvan"]);
    expect(state().status).toBe("enregistre");
  });

  it("dossier vide : le projet courant y est enregistré", async () => {
    await state().load();
    const title = state().title;
    storage.canPickFolder = true;
    vi.spyOn(storage, "location").mockReturnValue(null);
    vi.spyOn(storage, "pickFolder").mockResolvedValue(true);

    await state().save();

    expect(JSON.parse(disk()[META_FILE]).title).toBe(title);
  });
});
