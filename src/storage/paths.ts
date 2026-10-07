// Chemins du format de projet, partagés par tous les stockages.
export type FileMap = Record<string, string>;

export const META_FILE = "cosmos.json";
export const CARDS_DIR = "cartes";
export const cardPath = (id: string) => `${CARDS_DIR}/${id}.md`;
/** Manuscrit d'un roman : le texte de chaque scène, dans un fichier au nom de sa carte. */
export const MANUSCRIPT_DIR = "manuscrit";
export const manuscriptPath = (id: string) => `${MANUSCRIPT_DIR}/${id}.md`;
/** Dossiers de fichiers Markdown lus à l'ouverture d'un projet. */
export const TEXT_DIRS = [CARDS_DIR, MANUSCRIPT_DIR];
/** Images des cartes, copiées dans le projet. */
export const MEDIA_DIR = "medias";
/** Texte du scénario (Fountain). Absent des projets roman. */
export const SCREENPLAY_FILE = "scenario.fountain";
