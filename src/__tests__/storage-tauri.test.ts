// @vitest-environment happy-dom
// Stockage Tauri, plugins simulés : ce que l'app demande au système quand l'auteur choisit un dossier.

import { beforeEach, describe, expect, it, vi } from "vitest";

const dialog = vi.hoisted(() => ({ open: vi.fn(), save: vi.fn() }));
const fsPlugin = vi.hoisted(() => ({
  exists: vi.fn(async () => true),
  mkdir: vi.fn(async () => {}),
  readDir: vi.fn(async () => []),
  readTextFile: vi.fn(async () => "{}"),
  remove: vi.fn(async () => {}),
  writeFile: vi.fn(async () => {}),
  writeTextFile: vi.fn(async () => {}),
}));

vi.mock("@tauri-apps/plugin-dialog", () => dialog);
vi.mock("@tauri-apps/plugin-fs", () => fsPlugin);
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: async () => "C:\\Users\\moi\\AppData\\Roaming\\cosmos",
  join: async (...parts: string[]) => parts.join("\\"),
}));

import { tauriStorage } from "../storage/tauri";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("choisir le dossier d'un projet", () => {
  it("le dossier est demandé avec ses sous-dossiers (sinon l'écriture de cartes/ est refusée)", async () => {
    dialog.open.mockResolvedValue("D:\\Écriture\\Projet Cosmos");
    expect(await tauriStorage.pickFolder()).toBe(true);
    expect(dialog.open).toHaveBeenCalledWith(expect.objectContaining({ directory: true, recursive: true }));
    expect(tauriStorage.location()).toBe("Projet Cosmos");
  });

  it("créer un projet passe par le même dialogue ; annuler ne sélectionne rien", async () => {
    dialog.open.mockResolvedValue(null);
    tauriStorage.forget();
    expect(await tauriStorage.create()).toBe(false);
    expect(dialog.open).toHaveBeenCalledWith(expect.objectContaining({ recursive: true }));
    expect(tauriStorage.location()).toBeNull();
  });
});

describe("écrire un projet", () => {
  it("les cartes vont dans le sous-dossier cartes/ du dossier choisi", async () => {
    dialog.open.mockResolvedValue("D:\\Projet");
    await tauriStorage.pickFolder();
    await tauriStorage.write({ "cosmos.json": "{}", "cartes/a.md": "texte" }, ["cartes/b.md"]);
    expect(fsPlugin.mkdir).toHaveBeenCalledWith("D:\\Projet\\cartes", { recursive: true });
    expect(fsPlugin.writeTextFile).toHaveBeenCalledWith("D:\\Projet\\cosmos.json", "{}");
    expect(fsPlugin.writeTextFile).toHaveBeenCalledWith("D:\\Projet\\cartes\\a.md", "texte");
    expect(fsPlugin.remove).toHaveBeenCalledWith("D:\\Projet\\cartes\\b.md");
  });

  it("l'ancien dossier mémorisé rejoint la liste des projets", async () => {
    localStorage.setItem("cosmos:dernier-dossier", "D:\\Utilisateurs\\moi\\OneDrive\\Projet Cosmos");
    expect(await tauriStorage.list()).toEqual([
      { id: "D:\\Utilisateurs\\moi\\OneDrive\\Projet Cosmos", name: "Projet Cosmos", openedAt: 0 },
    ]);
    expect(localStorage.getItem("cosmos:dernier-dossier")).toBeNull();
  });
});
