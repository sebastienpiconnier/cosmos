// Stockage sur disque via Tauri : l'auteur choisit un dossier projet,
// Cosmos y lit et écrit cosmos.json et cartes/*.md.

import { open } from "@tauri-apps/plugin-dialog";
import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { Storage } from "./index";
import { CARDS_DIR, META_FILE, type FileMap } from "./paths";

const LAST_FOLDER_KEY = "cosmos:dernier-dossier";

let folder: string | null = (() => {
  try {
    return localStorage.getItem(LAST_FOLDER_KEY);
  } catch {
    return null;
  }
})();

export const tauriStorage: Storage = {
  kind: "tauri",
  location: () => (folder ? folder.split(/[\\/]/).pop() ?? folder : null),

  async pickFolder() {
    const chosen = await open({ directory: true, title: "Choisir le dossier du projet" });
    if (typeof chosen !== "string") return false;
    folder = chosen;
    try {
      localStorage.setItem(LAST_FOLDER_KEY, chosen);
    } catch {
      /* préférence non mémorisée, sans gravité */
    }
    return true;
  },

  async readAll() {
    if (!folder) return null;
    const metaPath = await join(folder, META_FILE);
    if (!(await exists(metaPath))) return null;
    const files: FileMap = { [META_FILE]: await readTextFile(metaPath) };
    const cardsDir = await join(folder, CARDS_DIR);
    if (await exists(cardsDir)) {
      for (const entry of await readDir(cardsDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          files[`${CARDS_DIR}/${entry.name}`] = await readTextFile(await join(cardsDir, entry.name));
        }
      }
    }
    return files;
  },

  async write(files, removed) {
    if (!folder) throw new Error("Aucun dossier projet choisi");
    await mkdir(await join(folder, CARDS_DIR), { recursive: true });
    for (const [path, content] of Object.entries(files)) {
      await writeTextFile(await join(folder, ...path.split("/")), content);
    }
    for (const path of removed) {
      const full = await join(folder, ...path.split("/"));
      if (await exists(full)) await remove(full);
    }
  },
};
