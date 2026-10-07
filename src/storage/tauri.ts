// Stockage sur disque via Tauri.
// - Ordinateur : l'auteur choisit un dossier projet (mémorisé pour la prochaine fois).
// - Mobile : iOS et Android n'offrent pas de vrai sélecteur de dossier, le projet vit
//   dans l'espace privé de l'app. La synchronisation entre appareils viendra plus tard.
// Dans les deux cas : cosmos.json + cartes/*.md (+ scenario.fountain), exactement le même format.

import { open, save } from "@tauri-apps/plugin-dialog";
import { exists, mkdir, readDir, readTextFile, remove, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { Storage } from "./index";
import { CARDS_DIR, META_FILE, SCREENPLAY_FILE, type FileMap } from "./paths";
import { isMobileOS } from "../platform";
import { getT } from "../i18n";

const LAST_FOLDER_KEY = "cosmos:dernier-dossier";
const MOBILE_PROJECT = "mon-projet";
const mobile = isMobileOS();

let folder: string | null = (() => {
  if (mobile) return null; // résolu à la première lecture (API asynchrone)
  try {
    return localStorage.getItem(LAST_FOLDER_KEY);
  } catch {
    return null;
  }
})();

async function projectFolder(): Promise<string | null> {
  if (!folder && mobile) folder = await join(await appDataDir(), "projets", MOBILE_PROJECT);
  return folder;
}

export const tauriStorage: Storage = {
  kind: "tauri",
  canPickFolder: !mobile,
  location: () => (mobile || !folder ? null : (folder.split(/[\\/]/).pop() ?? folder)),

  async pickFolder() {
    if (mobile) return true;
    const chosen = await open({ directory: true, title: getT().dialog.pickFolder });
    if (typeof chosen !== "string") return false;
    folder = chosen;
    try {
      localStorage.setItem(LAST_FOLDER_KEY, chosen);
    } catch {
      /* préférence non mémorisée, sans gravité */
    }
    return true;
  },

  forget() {
    if (mobile) return; // le dossier privé de l'app ne se choisit pas
    folder = null;
    try {
      localStorage.removeItem(LAST_FOLDER_KEY);
    } catch {
      /* rien à oublier */
    }
  },

  async readAll() {
    const dir = await projectFolder();
    if (!dir) return null;
    const metaPath = await join(dir, META_FILE);
    if (!(await exists(metaPath))) return null;
    const files: FileMap = { [META_FILE]: await readTextFile(metaPath) };
    const cardsDir = await join(dir, CARDS_DIR);
    if (await exists(cardsDir)) {
      for (const entry of await readDir(cardsDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          files[`${CARDS_DIR}/${entry.name}`] = await readTextFile(await join(cardsDir, entry.name));
        }
      }
    }
    const screenplayPath = await join(dir, SCREENPLAY_FILE);
    if (await exists(screenplayPath)) files[SCREENPLAY_FILE] = await readTextFile(screenplayPath);
    return files;
  },

  async write(files, removed) {
    const dir = await projectFolder();
    if (!dir) throw new Error("Aucun dossier projet choisi");
    await mkdir(await join(dir, CARDS_DIR), { recursive: true });
    for (const [path, content] of Object.entries(files)) {
      await writeTextFile(await join(dir, ...path.split("/")), content);
    }
    for (const path of removed) {
      const full = await join(dir, ...path.split("/"));
      if (await exists(full)) await remove(full);
    }
  },

  async saveAs(file, label) {
    // Dialogue « Enregistrer sous » du système : le chemin choisi est autorisé en écriture par Tauri.
    const path = await save({ defaultPath: file.name, filters: [{ name: label, extensions: [file.extension] }] });
    if (!path) return false;
    await writeFile(path, file.data);
    return true;
  },
};
