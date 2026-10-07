// Couche de stockage. Le format est le même partout : un "dossier projet"
//   cosmos.json        positions, fils, titre du projet
//   cartes/<id>.md     une carte par fichier, Markdown + frontmatter
//   scenario.fountain  texte du scénario (projets scénario uniquement)
//
// - Tauri sur ordinateur (macOS, Windows, Linux) : dossier choisi par l'auteur.
// - Tauri sur mobile (iOS, Android) : dossier privé de l'app (pas de sélecteur de dossier).
// - Navigateur (npm run dev) : les mêmes fichiers simulés dans localStorage.

import type { Project, ProjectMeta } from "../types";
import { cardToFile, fileToCard } from "./markdown";
import { browserStorage } from "./browser";
import { tauriStorage } from "./tauri";
import { CARDS_DIR, META_FILE, SCREENPLAY_FILE, cardPath, type FileMap } from "./paths";
import { parse as parseScreenplay } from "../screenplay/parse";
import { serialize as serializeScreenplay } from "../screenplay/serialize";
import { isTauri } from "../platform";

export * from "./paths";

export interface Storage {
  kind: "browser" | "tauri";
  /** L'auteur peut choisir où est son projet (faux sur mobile et dans le navigateur). */
  canPickFolder: boolean;
  /** Nom du dossier projet choisi (null dans le navigateur, sur mobile, ou si rien n'est choisi). */
  location(): string | null;
  /** Demande un dossier à l'auteur (Tauri uniquement). Renvoie false si annulé. */
  pickFolder(): Promise<boolean>;
  readAll(): Promise<FileMap | null>;
  /** Écrit les fichiers donnés et supprime ceux listés dans `removed`. */
  write(files: FileMap, removed: string[]): Promise<void>;
  /**
   * Export : l'auteur choisit où enregistrer (ordinateur, mobile) ou le fichier est téléchargé (navigateur).
   * `label` décrit le format dans le dialogue. Renvoie false si l'auteur annule.
   */
  saveAs(file: SavedFile, label: string): Promise<boolean>;
}

/** Fichier produit par un export. */
export interface SavedFile {
  name: string;
  extension: string;
  mime: string;
  data: Uint8Array;
}

export { isTauri };

export const storage: Storage = isTauri() ? tauriStorage : browserStorage;

export function serialize(project: Project): FileMap {
  const files: FileMap = { [META_FILE]: JSON.stringify(project.meta, null, 2) };
  for (const card of project.cards) files[cardPath(card.id)] = cardToFile(card);
  // Un projet roman n'a pas de scénario : le fichier n'est jamais créé pour lui.
  if (project.screenplay) files[SCREENPLAY_FILE] = serializeScreenplay(project.screenplay);
  return files;
}

export function deserialize(files: FileMap): Project | null {
  const raw = files[META_FILE];
  if (!raw) return null;
  const meta = JSON.parse(raw) as ProjectMeta;
  const cards = Object.entries(files)
    .filter(([path]) => path.startsWith(`${CARDS_DIR}/`) && path.endsWith(".md"))
    .map(([, text]) => fileToCard(text))
    .filter((c): c is NonNullable<typeof c> => c !== null);
  const screenplay = SCREENPLAY_FILE in files ? parseScreenplay(files[SCREENPLAY_FILE]) : null;
  return { meta, cards, screenplay };
}
