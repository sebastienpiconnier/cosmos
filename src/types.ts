// Modèle de données de Cosmos.
// Une carte naît "idee" (note libre) et peut être typée plus tard via le menu "/".

export type CardType = "idee" | "personnage" | "lieu" | "scene" | "theme" | "question";

export const CARD_TYPES: { type: CardType; label: string; color: string; bibleSection: string }[] = [
  { type: "idee", label: "Idée", color: "#5A5F73", bibleSection: "Idées en vrac" },
  { type: "personnage", label: "Personnage", color: "#3F43C4", bibleSection: "Personnages" },
  { type: "lieu", label: "Lieu", color: "#1E7F72", bibleSection: "Lieux" },
  { type: "scene", label: "Scène", color: "#C2700F", bibleSection: "Scènes" },
  { type: "theme", label: "Thème", color: "#B03A78", bibleSection: "Thèmes" },
  { type: "question", label: "Question ouverte", color: "#7A7F93", bibleSection: "Questions ouvertes" },
];

export const typeInfo = (t: CardType) => CARD_TYPES.find((c) => c.type === t) ?? CARD_TYPES[0];

/** Contenu d'une carte. Le corps est stocké en Markdown sur disque, en HTML dans l'éditeur. */
export interface CardData {
  id: string;
  type: CardType;
  title: string;
  /** Corps en HTML (format de travail de TipTap). Converti en Markdown à la sauvegarde. */
  html: string;
  [key: string]: unknown; // requis par React Flow pour data
}

/** Position d'une carte sur la toile. */
export interface CardLayout {
  id: string;
  x: number;
  y: number;
  width?: number;
}

/** Fil entre deux cartes, avec une étiquette libre ("soupçonne", "se passe à"…). */
export interface Link {
  id: string;
  source: string;
  target: string;
  label: string;
}

/** Fichier cosmos.json : tout ce qui n'est pas du texte. */
export interface ProjectMeta {
  version: 1;
  title: string;
  layout: CardLayout[];
  links: Link[];
  viewport?: { x: number; y: number; zoom: number };
}

/** Projet complet en mémoire. */
export interface Project {
  meta: ProjectMeta;
  cards: CardData[];
}
