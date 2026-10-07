// Modèle de données de Cosmos.
// Une carte naît "idee" (note libre) et peut être typée plus tard via le menu "/".

export type CardType = "idee" | "personnage" | "lieu" | "scene" | "theme" | "question";

/** Types dans l'ordre des menus. Libellés : i18n (`t.types[type]`). Couleurs : styles.css (`--type-<type>`). */
export const CARD_TYPES: CardType[] = ["idee", "personnage", "lieu", "scene", "theme", "question"];

/** Couleur d'un type, en variable CSS (s'adapte au mode clair/sombre). */
export const typeColor = (t: CardType) => `var(--type-${t})`;

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
