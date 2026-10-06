// Stockage de secours pour le navigateur (npm run dev sans Tauri).
// Simule le dossier projet : une clé localStorage contenant { chemin: contenu }.

import type { Storage } from "./index";
import type { FileMap } from "./paths";

const KEY = "cosmos:projet-demo";

function load(): FileMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as FileMap;
  } catch {
    return {};
  }
}

export const browserStorage: Storage = {
  kind: "browser",
  location: () => "Navigateur (démo)",
  pickFolder: async () => true,
  async readAll() {
    const files = load();
    return Object.keys(files).length ? files : null;
  },
  async write(files, removed) {
    const all = { ...load(), ...files };
    for (const path of removed) delete all[path];
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch (err) {
      console.warn("Sauvegarde navigateur impossible", err);
    }
  },
};
