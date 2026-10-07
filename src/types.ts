// Modèle de données de Cosmos.
// Une carte naît "idee" (note libre) et peut être typée plus tard via le menu "/".

import type { Screenplay } from "./screenplay/model";
import type { Paper } from "./screenplay/layout";
import type { Plan } from "./plan";

export type CardType = "idee" | "personnage" | "lieu" | "scene" | "theme" | "question";

/**
 * Nature du projet. Change le vocabulaire (Lieu → Décor, Plan → Séquencier…), le style des
 * scènes (en-têtes de scène) et, plus tard, l'éditeur de la vue Manuscrit (format scénario).
 * Les clés internes et le format des cartes restent identiques : on peut basculer à tout moment.
 */
export type ProjectKind = "roman" | "scenario";
export const PROJECT_KINDS: ProjectKind[] = ["roman", "scenario"];
export const isProjectKind = (v: unknown): v is ProjectKind => v === "roman" || v === "scenario";

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
  /** Image de la carte : nom d'un fichier du dossier medias/ du projet. */
  image?: string;
  [key: string]: unknown; // requis par React Flow pour data
}

/** Position d'une carte sur la toile. */
export interface CardLayout {
  id: string;
  x: number;
  y: number;
  width?: number;
}

/** Cadre de regroupement : un rectangle nommé derrière les cartes (« Acte 1 ? », « Le phare »). */
export interface Frame {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  /** Absent dans les projets créés avant le mode scénario : vaut alors "roman". */
  kind?: ProjectKind;
  /** Format de page du scénario. Absent : "letter". */
  paper?: Paper;
  /** Scénario : numéroter les scènes (éditeur, PDF, FDX). Absent : non. */
  sceneNumbers?: boolean;
  layout: CardLayout[];
  links: Link[];
  /** Cadres de regroupement. Absent : aucun. Les cartes n'y sont pas rattachées : c'est leur position qui compte. */
  frames?: Frame[];
  /** Plan d'un roman : gabarit et scènes rangées dans ses cases. Absent : plan libre, rien de rangé. */
  plan?: Plan;
  viewport?: { x: number; y: number; zoom: number };
}

/** Projet complet en mémoire. */
export interface Project {
  meta: ProjectMeta;
  cards: CardData[];
  /** Texte du scénario (scenario.fountain). null tant que le projet n'en a pas. */
  screenplay: Screenplay | null;
  /** Manuscrit d'un roman : texte de chaque scène (HTML), par identifiant de carte. Absent : rien d'écrit. */
  manuscript?: Record<string, string>;
}
