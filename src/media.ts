// Images des cartes : fichiers copiés dans le dossier medias/ du projet.
// Une carte ne porte que le nom du fichier (champ `image:` de son en-tête).

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Extension d'image reconnue (en minuscules), ou null. */
export function imageExtension(fileName: string): string | null {
  const ext = /\.([A-Za-z0-9]+)$/.exec(fileName)?.[1].toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.includes(ext) ? ext : null;
}

export const mimeOf = (fileName: string): string => MIME[imageExtension(fileName) ?? ""] ?? "application/octet-stream";

/**
 * Un nom de fichier de medias/ lu sur disque est-il sûr ? Lettres, chiffres, tiret, souligné et un
 * seul point avant l'extension : ni chemin, ni « .. ». Un .md piégé ne doit pas faire lire un autre fichier.
 */
export const isMediaName = (name: unknown): name is string =>
  typeof name === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(name) && imageExtension(name) !== null;

/** Largeur d'une carte, bornée. */
export const CARD_MIN_WIDTH = 180;
export const CARD_MAX_WIDTH = 640;
export const clampCardWidth = (width: number): number => Math.round(Math.min(CARD_MAX_WIDTH, Math.max(CARD_MIN_WIDTH, width)));
