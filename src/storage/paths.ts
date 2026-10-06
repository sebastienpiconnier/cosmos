// Chemins du format de projet, partagés par tous les stockages.
export type FileMap = Record<string, string>;

export const META_FILE = "cosmos.json";
export const CARDS_DIR = "cartes";
export const cardPath = (id: string) => `${CARDS_DIR}/${id}.md`;
