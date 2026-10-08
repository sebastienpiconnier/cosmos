// État global de Cosmos (Zustand).
// Les nœuds React Flow portent directement les CardData : la toile EST le modèle.

import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { isProjectKind, type CardData, type CardType, type Frame, type Project, type ProjectKind } from "./types";
import { SCREENPLAY_FILE, deserialize, serialize, storage, type FileMap, type ProjectEntry } from "./storage";
import type { Screenplay } from "./screenplay/model";
import { defaultPaper, isPaper, type Paper } from "./screenplay/layout";
import { useSettings } from "./settings";
import { importFountain } from "./screenplay/import";
import { CARD_SIZE, firstFreeCell, freeSpot, type Box } from "./placement";
import { clampCardWidth, imageExtension } from "./media";
import { removeMentions, renameMentions } from "./mentions";
import { countWords, isBlank, type Manuscript } from "./manuscript";
import { dayKey, readGoals, readProgress, recordProgress, type Goals, type Progress } from "./stats";
import { appendAnswer, isParked } from "./assistant";
import { addQuestion, legacyParkedCards, removeQuestion, setFicheField, type SheetField } from "./character";
import {
  EMPTY_PLAN,
  arrange,
  assignChapter,
  chapterOf,
  isEmptyPlan,
  placeScene,
  planOrder,
  prunePlan,
  readPlan,
  removeChapter,
  renameChapter,
  setTemplate,
  startChapter,
  stepScene,
  type Plan,
  type PlanTemplate,
} from "./plan";
import { organize } from "./organize";
import { storyScenes } from "./book";
import { readTitleField, writeTitleField, type TitleField } from "./screenplay/titlePage";
import {
  appendScene,
  headingTitles,
  initialScreenplay,
  releaseCard,
  renameHeading,
  type SceneCard,
} from "./screenplay/link";
import { DICTIONARIES, fmt, getT } from "./i18n";

export type CardNode = Node<CardData, "card">;
/** Cadre de regroupement sur le canevas. Tenu à part des cartes : toutes les vues lisent `nodes` sans s'en soucier. */
export type FrameNode = Node<{ title: string }, "frame">;

const FRAME_SIZE = { width: 520, height: 360 };
/** Marge autour des cartes qu'un cadre entoure (plus haute en tête, pour son titre). */
const FRAME_PADDING = { side: 32, top: 64, bottom: 32 };

const toFrameNode = (frame: Frame): FrameNode => ({
  id: frame.id,
  type: "frame",
  position: { x: frame.x, y: frame.y },
  data: { title: frame.title },
  width: frame.width,
  height: frame.height,
  // Derrière les cartes ; l'intérieur laisse passer les clics (voir styles.css).
  zIndex: -1,
  dragHandle: ".frame-handle",
});

const frameBox = (f: FrameNode): Box => ({
  x: f.position.x,
  y: f.position.y,
  width: f.width ?? f.measured?.width ?? FRAME_SIZE.width,
  height: f.height ?? f.measured?.height ?? FRAME_SIZE.height,
});
export type View = "toile" | "plan" | "bible" | "manuscrit";
export type SaveStatus = "enregistre" | "modifie" | "enregistrement" | "erreur";

export const CARD_WIDTH = 240;

interface CosmosState {
  title: string;
  kind: ProjectKind;
  setKind: (kind: ProjectKind) => void;
  /** Plan d'un roman : gabarit choisi et scènes rangées dans ses cases (voir plan.ts). */
  plan: Plan;
  setPlanTemplate: (template: PlanTemplate) => void;
  /** Range une scène dans une case du plan (à la fin, ou à la position donnée) ; `beat` null la sort du plan. */
  placeInPlan: (id: string, beat: string | null, index?: number) => void;
  /** Monte ou descend une scène d'un cran dans le plan. Rend faux si elle ne peut pas bouger. */
  stepInPlan: (id: string, way: "up" | "down") => boolean;
  /** Crée une carte Scène et la range dans cette case du plan. */
  addPlanScene: (title: string, beat: string, chapterId?: string | null) => string;
  /**
   * Manuscrit, deux fois Entrée : une nouvelle scène juste après `afterId`, dans la même case du plan et le
   * même chapitre, avec le texte `html` (la suite de la scène coupée). Rend son identifiant.
   */
  splitScene: (afterId: string, html: string) => string | null;
  /** Coupe le récit : un nouveau chapitre commence à cette scène. Rend son identifiant. */
  startChapterAt: (sceneId: string) => string | null;
  /** Range une scène dans un chapitre, ou l'en sort (null). */
  setSceneChapter: (sceneId: string, chapterId: string | null) => void;
  renamePlanChapter: (id: string, title: string) => void;
  /** Supprime un chapitre ; ses scènes rejoignent le chapitre précédent. */
  deletePlanChapter: (id: string) => void;
  /** Range toutes les cartes du canevas en cadres (type, gabarit, chapitres) et relie les scènes. */
  organizeCanvas: () => void;
  /** Assistant personnage : ajoute la question (en gras) et la réponse au texte de la fiche. */
  answerQuestion: (id: string, question: string, answer: string) => void;
  /** Assistant personnage, « Je ne sais pas encore » : crée une carte Question reliée au personnage. */
  parkQuestion: (id: string, question: string) => boolean;
  /** Retire une question gardée pour plus tard (répondue ailleurs, ou plus utile). */
  dropQuestion: (id: string, question: string) => void;
  /** Change un champ de la fiche d'un personnage (vide : retiré). */
  setFiche: (id: string, field: SheetField, value: string) => void;
  /** Ouvre la fiche d'une carte dans la Bible ; `assistant` : avec l'assistant ouvert. */
  openInBible: (id: string, assistant?: boolean) => void;
  /** Fiche à montrer en arrivant dans la Bible, puis remise à null. */
  bibleTarget: { id: string; assistant: boolean } | null;
  /** Demande au canevas de cadrer tout le projet (après un rangement). */
  fitRequest: number;
  clearBibleTarget: () => void;
  /** Crée une carte Question reliée aux cartes citées (alerte de cohérence gardée pour plus tard). */
  addQuestionAbout: (title: string, cardIds: string[]) => string;
  /** Manuscrit d'un roman : texte de chaque scène (HTML), par identifiant de carte Scène. */
  manuscript: Manuscript;
  setManuscriptText: (id: string, html: string) => void;
  goals: Goals;
  setGoals: (goals: Goals) => void;
  progress: Progress;
  /** Recrée la carte Scène d'un texte du manuscrit dont la carte a été supprimée. */
  restoreScene: (id: string) => void;
  /** Renomme le projet (et la page de titre du scénario, si elle portait l'ancien titre). */
  setTitle: (title: string) => void;
  /** Format de page du scénario (estimation des pages, puis PDF). */
  paper: Paper;
  /** Faux tant que le format n'a pas été fixé (projet roman) : il n'est alors pas écrit dans cosmos.json. */
  paperChosen: boolean;
  setPaper: (paper: Paper) => void;
  /** Scénario : numéroter les scènes dans l'éditeur et les exports. */
  sceneNumbers: boolean;
  setSceneNumbers: (on: boolean) => void;
  /** Mode focus de l'éditeur de scénario : seule la feuille reste à l'écran. */
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
  nodes: CardNode[];
  edges: Edge[];
  /** Texte du scénario (scenario.fountain). null tant que le projet n'a jamais été un scénario. */
  screenplay: Screenplay | null;
  /** Le scénario tel qu'il est sur disque : tant qu'il n'a pas changé, le fichier n'est pas réécrit. */
  savedScreenplay: Screenplay | null;
  /**
   * Remplace le scénario. Les titres des cartes liées suivent leurs en-têtes.
   * `undoable` : le changement entre dans l'historique (séquencier). Sinon il vient de l'éditeur, qui a
   * son propre historique : celui du canevas est alors vidé, pour qu'annuler une carte n'efface jamais du texte.
   */
  setScreenplay: (screenplay: Screenplay, undoable?: boolean) => void;
  /**
   * Écrit un champ de la page de titre du scénario (une valeur vide le retire) et rend le scénario
   * obtenu. Le titre du projet suit quand il était le même ; le nom d'auteur est retenu sur l'appareil.
   */
  setTitlePageField: (field: TitleField, value: string) => Screenplay | null;
  /** Historique d'annulation : états précédents et états annulés (cartes, fils, scénario). */
  past: Snapshot[];
  future: Snapshot[];
  undo: () => void;
  redo: () => void;
  /** Montre une carte sur le canevas (résultat de recherche) : vue Canevas, carte centrée et sélectionnée. */
  revealCard: (id: string) => void;
  view: View;
  focusId: string | null;
  /** Carte qui vient d'être créée : son éditeur prend le focus dès qu'il est prêt. */
  pendingFocusId: string | null;
  clearPendingFocus: () => void;
  status: SaveStatus;
  loaded: boolean;
  /** Accueil (choix du projet) ou projet ouvert. */
  screen: "home" | "project";
  /** Projets connus de cet appareil, pour l'accueil. */
  projects: ProjectEntry[];
  /** Le dossier choisi à l'accueil ne contient pas de projet. */
  homeNotice: boolean;
  /** Au lancement : liste les projets et affiche l'accueil. */
  start: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  createProject: (options: { title: string; kind: ProjectKind }) => Promise<void>;
  /** Un fichier Fountain existant devient un nouveau projet scénario, avec ses cartes. */
  importScreenplay: () => Promise<void>;
  /** L'import n'a pas eu lieu : dossier déjà occupé par un projet, ou fichier sans scénario. */
  importNotice: "taken" | "empty" | null;
  /** Nouveau projet rempli avec l'exemple, pour découvrir l'app. */
  tryExample: () => Promise<void>;
  /** Enregistre et revient à l'accueil. `force` : y revenir même si l'enregistrement a échoué. */
  closeProject: (force?: boolean) => Promise<void>;
  /** Retire un projet de la liste de l'accueil, sans toucher à ses fichiers. */
  unlistProject: (id: string) => Promise<void>;
  /** Le dossier du projet n'a pas pu être ouvert : un message, à l'accueil, invite à le choisir à nouveau. */
  openFailed: boolean;
  dismissOpenFailed: () => void;
  lastFiles: FileMap;

  /** Cadres de regroupement, affichés derrière les cartes. */
  frames: FrameNode[];
  /** Nouveau cadre : autour des cartes sélectionnées s'il y en a, sinon centré sur le point donné. */
  addFrame: (center: { x: number; y: number }) => string;
  updateFrame: (id: string, patch: { title: string }) => void;
  /** Supprime le cadre ; les cartes qu'il contenait restent. */
  deleteFrame: (id: string) => void;
  onNodesChange: (changes: NodeChange<CardNode | FrameNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (c: Connection) => void;

  /** `height` : hauteur à réserver quand on la connaît d'avance (carte qui va recevoir une image). */
  addCard: (pos: { x: number; y: number }, type?: CardType, height?: number) => string;
  /** Carte créée depuis une autre vue (Bible, scénario) : posée sur la première place libre, sans prendre le focus. */
  addTitledCard: (type: CardType, title: string) => string;
  /** Tire un fil entre deux cartes s'il n'y en a pas, sinon retire celui (ou ceux) qui les relie. */
  toggleLink: (a: string, b: string) => void;
  /** Tire un fil étiqueté entre deux cartes, s'il n'y en a pas déjà un. */
  linkCards: (source: string, target: string, label: string) => void;
  updateCard: (id: string, patch: Partial<Omit<CardData, "id">>) => void;
  /** Élargit ou rétrécit une carte (clavier) ; la hauteur suit le contenu. */
  resizeCard: (id: string, delta: number) => void;
  /** Copie l'image dans medias/ et la pose sur la carte. Rend faux si ce n'est pas une image ou si la copie échoue. */
  setCardImage: (id: string, file: { name: string; data: Uint8Array }) => Promise<boolean>;
  /** Image déposée sur le canevas : une nouvelle carte la porte. */
  addImageCard: (pos: { x: number; y: number }, file: { name: string; data: Uint8Array }) => Promise<string | null>;
  /** Bouton de la carte : l'auteur choisit un fichier image. */
  pickCardImage: (id: string) => Promise<void>;
  /** Galerie d'une fiche : ajoute des photos (choisies ou déposées), en une étape d'historique. */
  addGalleryImages: (id: string, files?: { name: string; data: Uint8Array }[]) => Promise<number>;
  /** Retire une photo de la galerie (le fichier reste dans medias/, l'annulation la rend). */
  removeGalleryImage: (id: string, name: string) => void;
  /** Une photo de la galerie devient l'image principale (le portrait) ; l'ancienne rejoint la galerie. */
  useAsMainImage: (id: string, name: string) => void;
  deleteCard: (id: string) => void;
  renameLink: (id: string, label: string) => void;

  setView: (view: View, focusId?: string | null) => void;
  /** Ouvre le projet sélectionné dans le stockage, ou démarre le projet d'exemple si l'emplacement est vide. */
  load: () => Promise<void>;
  openFolder: () => Promise<void>;
  save: () => Promise<void>;
}

/** Ce qu'une annulation restaure. Les réglages du projet (titre, type, format) n'en font pas partie. */
export interface Snapshot {
  nodes: CardNode[];
  frames: FrameNode[];
  edges: Edge[];
  screenplay: Screenplay | null;
  plan: Plan;
}

/** Hauteur réservée pour l'image d'une carte créée par dépôt (voir .card-image dans styles.css). */
const IMAGE_ROOM = 220;

const HISTORY_LIMIT = 100;
/** Deux gestes de même nature rapprochés (lettres d'un titre, déplacement) ne font qu'une étape. */
const HISTORY_MERGE_MS = 800;

const newId = () => nanoid(10);

/** Même carte si son texte ne change pas (les mentions ne touchent que les cartes concernées). */
const withHtml = (node: CardNode, html: string): CardNode => (html === node.data.html ? node : { ...node, data: { ...node.data, html } });

const toNode = (card: CardData, x: number, y: number, width = CARD_WIDTH): CardNode => ({
  id: card.id,
  type: "card",
  position: { x, y },
  data: card,
  style: { width },
  // L'en-tête et l'image déplacent la carte (le titre et le texte restent des zones d'écriture).
  dragHandle: ".card-handle, .card-image",
});

function fromProject(p: Project) {
  const pos = new Map(p.meta.layout.map((l) => [l.id, l]));
  const nodes = p.cards.map((c, i) => {
    const l = pos.get(c.id);
    return toNode(c, l?.x ?? 80 + (i % 5) * 280, l?.y ?? 80 + Math.floor(i / 5) * 220, l?.width);
  });
  const edges: Edge[] = p.meta.links.map((l) => ({ id: l.id, source: l.source, target: l.target, label: l.label, type: "floating" }));
  const kind: ProjectKind = isProjectKind(p.meta.kind) ? p.meta.kind : "roman";
  const paperChosen = isPaper(p.meta.paper);
  const paper: Paper = isPaper(p.meta.paper) ? p.meta.paper : defaultPaper(useSettings.getState().lang);
  const frames = (p.meta.frames ?? [])
    .filter((f) => typeof f?.id === "string" && [f.x, f.y, f.width, f.height].every((n) => typeof n === "number" && Number.isFinite(n)))
    .map((f) => toFrameNode({ ...f, title: String(f.title ?? "") }));
  return { title: p.meta.title, kind, paper, paperChosen, sceneNumbers: p.meta.sceneNumbers === true, nodes, frames, edges, plan: readPlan(p.meta.plan), manuscript: p.manuscript ?? {}, goals: readGoals(p.meta.goals), progress: readProgress(p.meta.progress) };
}

/** Rectangles des cartes sur le canevas (hauteur mesurée par React Flow quand elle est connue). */
const boxes = (nodes: CardNode[]): Box[] =>
  nodes.map((n) => ({
    x: n.position.x,
    y: n.position.y,
    width: typeof n.style?.width === "number" ? n.style.width : CARD_WIDTH,
    height: n.measured?.height ?? CARD_SIZE.height,
  }));

/** Cartes Scène dans l'ordre de la toile, de haut en bas (en attendant le Séquencier). */
function sceneCards(nodes: CardNode[]): SceneCard[] {
  return nodes
    .filter((n) => n.data.type === "scene")
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    .map((n) => ({ id: n.id, title: n.data.title }));
}

/**
 * Cartes Scène du récit dans l'ordre par défaut du plan (celui du canevas), pour les fonctions de plan.ts.
 * Les pages hors récit (dédicace, prologue…) n'y sont pas : voir book.ts.
 */
export const planScenes = (nodes: CardNode[]): string[] => storyScenes(nodes);

/** Premier scénario d'un projet : la page de titre porte aussi l'auteur connu de l'appareil. */
function firstScreenplay(title: string, nodes: CardNode[]): Screenplay {
  const screenplay = initialScreenplay(title, sceneCards(nodes));
  const author = useSettings.getState().author.trim();
  if (!author) return screenplay;
  let titlePage = writeTitleField(screenplay.titlePage, "credit", getT().screenplay.titlePage.creditDefault);
  titlePage = writeTitleField(titlePage, "author", author);
  return { ...screenplay, titlePage };
}

/** L'en-tête fait foi : les cartes Scène liées prennent le texte de leur en-tête. */
function titlesFromHeadings(nodes: CardNode[], screenplay: Screenplay): CardNode[] {
  const titles = headingTitles(screenplay);
  let changed = false;
  const next = nodes.map((n) => {
    const title = titles.get(n.id);
    if (n.data.type !== "scene" || title === undefined || title === n.data.title) return n;
    changed = true;
    return { ...n, data: { ...n.data, title } };
  });
  return changed ? next : nodes;
}

/**
 * Anciennes cartes Question « à creuser » (créées par l'assistant avant que les questions ne vivent dans
 * la carte du personnage) : leur question passe dans le personnage, et elles quittent le canevas.
 */
function adoptParkedCards(nodes: CardNode[], edges: Edge[]): { nodes: CardNode[]; edges: Edge[] } {
  const labels = Object.values(DICTIONARIES).map((d) => d.assistant.linkLabel);
  const found = legacyParkedCards(
    nodes.map((n) => n.data),
    edges.map((e) => ({ source: e.source, target: e.target, label: String(e.label ?? "") })),
    labels,
  );
  if (found.length === 0) return { nodes, edges };
  const gone = new Set(found.map((f) => f.cardId));
  const byCharacter = new Map<string, string[]>();
  for (const f of found) byCharacter.set(f.characterId, [...(byCharacter.get(f.characterId) ?? []), f.question]);
  return {
    nodes: nodes
      .filter((n) => !gone.has(n.id))
      .map((n) => {
        const added = byCharacter.get(n.id);
        if (!added) return n;
        const questions = added.reduce<string[] | undefined>((list, q) => addQuestion(list, q), n.data.questions);
        return { ...n, data: { ...n.data, questions } };
      }),
    edges: edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)),
  };
}

/** État à adopter quand on ouvre un projet. `dirty` : l'ouverture a produit des changements à enregistrer. */
function openProject(p: Project) {
  const read = fromProject(p);
  const adopted = adoptParkedCards(read.nodes, read.edges);
  const base = { ...read, ...adopted };
  // Projet scénario sans fichier (créé avant l'éditeur) : on le prépare à partir des cartes Scène.
  const screenplay =
    p.screenplay ?? (base.kind === "scenario" ? firstScreenplay(base.title, base.nodes) : null);
  const nodes = screenplay ? titlesFromHeadings(base.nodes, screenplay) : base.nodes;
  // Un scénario fixe son format de page une fois pour toutes (selon la langue du moment), pour que
  // la pagination ne change pas d'un appareil à l'autre.
  const paperChosen = base.paperChosen || base.kind === "scenario";
  return {
    // Un projet qu'on ouvre repart d'un historique vide.
    state: { ...base, paperChosen, nodes, screenplay, savedScreenplay: p.screenplay, past: [], future: [] },
    dirty: screenplay !== p.screenplay || nodes !== base.nodes || paperChosen !== base.paperChosen || adopted.nodes !== read.nodes,
  };
}

function toProject(
  s: Pick<
    CosmosState,
    "title" | "kind" | "paper" | "paperChosen" | "sceneNumbers" | "nodes" | "frames" | "edges" | "screenplay" | "plan" | "manuscript" | "goals" | "progress"
  >,
): Project {
  // Le plan écrit ne cite que des cartes qui existent encore.
  const plan = prunePlan(s.plan, new Set(s.nodes.map((n) => n.id)));
  return {
    meta: {
      version: 1,
      title: s.title,
      kind: s.kind,
      ...(s.paperChosen ? { paper: s.paper } : {}),
      ...(s.sceneNumbers ? { sceneNumbers: true } : {}),
      layout: s.nodes.map((n) => ({
        id: n.id,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        width: typeof n.style?.width === "number" ? n.style.width : undefined,
      })),
      links: s.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: String(e.label ?? "") })),
      ...(s.frames.length > 0
        ? {
            frames: s.frames.map((f) => {
              const box = frameBox(f);
              return { id: f.id, title: f.data.title, x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
            }),
          }
        : {}),
      ...(isEmptyPlan(plan) ? {} : { plan }),
      ...(s.goals.daily || s.goals.total ? { goals: s.goals } : {}),
      ...(Object.keys(s.progress).length > 0 ? { progress: s.progress } : {}),
    },
    cards: s.nodes.map((n) => n.data),
    screenplay: s.screenplay,
    manuscript: s.manuscript,
  };
}

const p = (text: string) => `<p>${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</p>`;

/** Projet d'exemple affiché au premier lancement, dans la langue de l'interface. */
function demoProject(): Project {
  const d = getT().demo;
  const ines = newId(), phare = newId(), idee = newId(), scene = newId();
  return {
    meta: {
      version: 1,
      title: d.title,
      kind: "roman",
      layout: [
        { id: idee, x: 60, y: 60 },
        { id: ines, x: 120, y: 300 },
        { id: phare, x: 620, y: 120 },
        { id: scene, x: 560, y: 420 },
      ],
      links: [
        { id: newId(), source: ines, target: phare, label: d.linkWorksAt },
        { id: newId(), source: scene, target: phare, label: d.linkSetIn },
      ],
    },
    cards: [
      { id: idee, type: "idee", title: "", html: p(d.idea) },
      { id: ines, type: "personnage", title: d.characterTitle, html: p(d.characterBody) },
      { id: phare, type: "lieu", title: d.placeTitle, html: p(d.placeBody) },
      { id: scene, type: "scene", title: d.sceneTitle, html: p(d.sceneBody) },
    ],
    screenplay: null,
  };
}

export const useCosmos = create<CosmosState>((set, get) => {
  const touch = () => set({ status: "modifie" });

  // Historique : chaque action qui change les cartes, les fils ou leur lien avec le scénario
  // appelle record() AVANT de modifier l'état.
  let lastTag = "";
  let lastAt = 0;
  const record = (tag = "") => {
    const now = Date.now();
    const merge = tag !== "" && tag === lastTag && now - lastAt < HISTORY_MERGE_MS;
    lastTag = tag;
    lastAt = now;
    if (merge) return;
    const { nodes, frames, edges, screenplay, plan, past } = get();
    set({ past: [...past.slice(-(HISTORY_LIMIT - 1)), { nodes, frames, edges, screenplay, plan }], future: [] });
  };
  const forgetHistory = () => {
    lastTag = "";
    if (get().past.length > 0 || get().future.length > 0) set({ past: [], future: [] });
  };
  const restore = (from: "past" | "future") => {
    const { past, future, nodes, frames, edges, screenplay, plan } = get();
    const stack = from === "past" ? past : future;
    const target = stack[stack.length - 1];
    if (!target) return;
    lastTag = "";
    const here: Snapshot = { nodes, frames, edges, screenplay, plan };
    set({
      past: from === "past" ? past.slice(0, -1) : [...past, here],
      future: from === "past" ? [...future, here] : future.slice(0, -1),
      nodes: target.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      frames: target.frames.map((f) => (f.selected ? { ...f, selected: false } : f)),
      edges: target.edges,
      screenplay: target.screenplay,
      plan: target.plan,
      pendingFocusId: null,
    });
    touch();
  };
  /** Adopte un projet lu sur disque. Rend faux si ces fichiers ne forment pas un projet. */
  const openFiles = (files: FileMap): boolean => {
    const project = deserialize(files);
    if (!project) return false;
    const { state, dirty } = openProject(project);
    set({
      ...state,
      lastFiles: files,
      screen: "project",
      view: "toile",
      focusId: null,
      openFailed: false,
      homeNotice: false,
      status: dirty ? "modifie" : "enregistre",
    });
    storage.remember({ title: state.title, kind: state.kind });
    return true;
  };
  const refreshProjects = async () => set({ projects: await storage.list().catch(() => []) });

  return {
    title: "",
    kind: "roman",
    setTitle: (title) => {
      const { title: previous, screenplay } = get();
      const key = screenplay && Object.keys(screenplay.titlePage).find((k) => k.trim().toLowerCase() === "title");
      // La page de titre suit tant qu'elle portait le titre du projet ; un titre écrit à la main n'est pas touché.
      if (screenplay && key && title.trim() && screenplay.titlePage[key].trim() === previous.trim()) {
        forgetHistory(); // la page de titre change hors historique
        set({ title, screenplay: { ...screenplay, titlePage: { ...screenplay.titlePage, [key]: title.trim() } } });
      } else {
        set({ title });
      }
      touch();
    },
    setKind: (kind) => {
      // Le type de projet peut créer le scénario : l'historique d'avant ne vaut plus.
      forgetHistory();
      const { screenplay, title, nodes, paperChosen } = get();
      // Premier passage en scénario : un en-tête par carte Scène. Le retour en roman ne supprime rien.
      if (kind === "scenario" && !screenplay) set({ kind, screenplay: firstScreenplay(title, nodes) });
      else set({ kind });
      // Et un format de page : A4 si l'interface est en français, US Letter sinon.
      if (kind === "scenario" && !paperChosen) set({ paper: defaultPaper(useSettings.getState().lang), paperChosen: true });
      touch();
    },
    answerQuestion: (id, question, answer) => {
      const card = get().nodes.find((n) => n.id === id)?.data;
      if (!card) return;
      const html = appendAnswer(card.html, question, answer);
      if (html === card.html) return;
      // Une question gardée pour plus tard, qui reçoit enfin sa réponse, quitte la liste.
      const questions = removeQuestion(card.questions, question);
      get().updateCard(id, questions === card.questions ? { html } : { html, questions });
    },
    parkQuestion: (id, question) => {
      const { nodes, edges } = get();
      const character = nodes.find((n) => n.id === id)?.data;
      if (!character || !question.trim() || isParked(nodes.map((n) => n.data), edges, id, question)) return false;
      // La question reste dans la carte du personnage : rien de plus sur le canevas.
      get().updateCard(id, { questions: addQuestion(character.questions, question) });
      return true;
    },
    dropQuestion: (id, question) => {
      const card = get().nodes.find((n) => n.id === id)?.data;
      if (!card) return;
      const questions = removeQuestion(card.questions, question);
      if (questions !== card.questions) get().updateCard(id, { questions });
    },
    setFiche: (id, field, value) => {
      const card = get().nodes.find((n) => n.id === id)?.data;
      if (!card || (card.fiche?.[field] ?? "") === value) return;
      // Les lettres d'un même champ tapées d'affilée ne font qu'une étape d'historique.
      record(`card:${id}:fiche:${field}`);
      const fiche = setFicheField(card.fiche, field, value);
      set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, fiche } } : n)) });
      touch();
    },
    openInBible: (id, assistant = false) => {
      if (!get().nodes.some((n) => n.id === id)) return;
      set({ view: "bible", bibleTarget: { id, assistant } });
    },
    bibleTarget: null,
    clearBibleTarget: () => set({ bibleTarget: null }),
    fitRequest: 0,
    addQuestionAbout: (title, cardIds) => {
      const { nodes, edges } = get();
      // Une seule étape d'historique pour la carte et ses fils.
      record();
      const card: CardData = { id: newId(), type: "question", title: title.trim(), html: "" };
      const spot = firstFreeCell(boxes(nodes));
      let next = edges;
      for (const target of new Set(cardIds)) {
        if (!nodes.some((n) => n.id === target)) continue;
        next = addEdge({ id: newId(), source: card.id, target, sourceHandle: null, targetHandle: null, label: "", type: "floating" }, next);
      }
      set({ nodes: [...nodes, toNode(card, spot.x, spot.y)], edges: next });
      touch();
      return card.id;
    },
    manuscript: {},
    setManuscriptText: (id, html) => {
      const manuscript = { ...get().manuscript };
      const before = manuscript[id] ?? "";
      const next = isBlank(html) ? "" : html;
      if (before === next) return;
      if (next) manuscript[id] = next;
      else delete manuscript[id];
      // Mots écrits aujourd'hui : le total du jour suit, à partir de la différence dans cette scène.
      const day = dayKey(new Date());
      const { progress } = get();
      const totalBefore = progress[day]?.end ?? Object.values(get().manuscript).reduce((sum, html) => sum + countWords(html), 0);
      const totalAfter = Math.max(0, totalBefore + countWords(next) - countWords(before));
      set({ manuscript, progress: recordProgress(progress, day, totalBefore, totalAfter) });
      touch();
    },
    goals: {},
    setGoals: (goals) => {
      set({ goals: readGoals(goals) });
      touch();
    },
    progress: {},
    restoreScene: (id) => {
      if (get().nodes.some((n) => n.id === id) || !(id in get().manuscript)) return;
      record();
      const card: CardData = { id, type: "scene", title: "", html: "" };
      const spot = firstFreeCell(boxes(get().nodes));
      set({ nodes: [...get().nodes, toNode(card, spot.x, spot.y)] });
      touch();
    },
    plan: EMPTY_PLAN,
    setPlanTemplate: (template) => {
      const plan = setTemplate(get().plan, template);
      if (plan === get().plan) return;
      record();
      set({ plan });
      touch();
    },
    placeInPlan: (id, beat, index) => {
      const plan = placeScene(get().plan, planScenes(get().nodes), id, beat, index);
      if (plan === get().plan) return;
      record();
      set({ plan });
      touch();
    },
    stepInPlan: (id, way) => {
      const plan = stepScene(get().plan, planScenes(get().nodes), id, way);
      if (plan === get().plan) return false;
      record();
      set({ plan });
      touch();
      return true;
    },
    addPlanScene: (title, beat, chapterId) => {
      record();
      const card: CardData = { id: newId(), type: "scene", title, html: "" };
      const spot = firstFreeCell(boxes(get().nodes));
      const nodes = [...get().nodes, toNode(card, spot.x, spot.y)];
      let plan = placeScene(get().plan, planScenes(nodes), card.id, beat);
      // Sans chapitre précisé, la scène rejoint celui de la scène qui la précède dans le récit.
      let chapter = chapterId;
      if (chapter === undefined) {
        const order = planOrder(plan, planScenes(nodes));
        const before = order[order.indexOf(card.id) - 1];
        chapter = before ? (chapterOf(plan, before)?.id ?? null) : null;
      }
      if (chapter) plan = assignChapter(plan, card.id, chapter);
      set({ nodes, plan });
      touch();
      return card.id;
    },
    splitScene: (afterId, html) => {
      const { nodes, plan } = get();
      const after = nodes.find((n) => n.id === afterId);
      if (!after || after.data.type !== "scene") return null;
      record();
      const card: CardData = { id: newId(), type: "scene", title: "", html: "" };
      // Sur le canevas, juste sous la scène coupée : l'ordre par défaut (de haut en bas) reste juste.
      const [box] = boxes([after]);
      const spot = freeSpot({ x: box.x, y: box.y + box.height + 24 }, boxes(nodes), { width: CARD_SIZE.width, height: CARD_SIZE.height });
      const next = [...nodes, toNode(card, spot.x, spot.y)];
      const ids = planScenes(next);
      const { beats } = arrange(plan, ids);
      const beat = beats.find((b) => b.ids.includes(afterId));
      let nextPlan = beat ? placeScene(plan, ids, card.id, beat.key, beat.ids.indexOf(afterId) + 1) : plan;
      const chapter = chapterOf(plan, afterId);
      if (chapter) nextPlan = assignChapter(nextPlan, card.id, chapter.id);
      const manuscript = { ...get().manuscript };
      if (!isBlank(html)) manuscript[card.id] = html;
      set({ nodes: next, plan: nextPlan, manuscript });
      touch();
      return card.id;
    },
    startChapterAt: (sceneId) => {
      const id = newId();
      const plan = startChapter(get().plan, planOrder(get().plan, planScenes(get().nodes)), sceneId, id);
      if (plan === get().plan) return null;
      record();
      set({ plan });
      touch();
      return id;
    },
    setSceneChapter: (sceneId, chapterId) => {
      const plan = assignChapter(get().plan, sceneId, chapterId);
      if (plan === get().plan) return;
      record();
      set({ plan });
      touch();
    },
    renamePlanChapter: (id, title) => {
      const plan = renameChapter(get().plan, id, title);
      if (plan === get().plan) return;
      record(`chapter:${id}:title`);
      set({ plan });
      touch();
    },
    deletePlanChapter: (id) => {
      const plan = removeChapter(get().plan, planOrder(get().plan, planScenes(get().nodes)), id);
      if (plan === get().plan) return;
      record();
      set({ plan });
      touch();
    },
    organizeCanvas: () => {
      const { nodes, edges, plan, kind } = get();
      if (nodes.length === 0) return;
      const t = getT();
      const types = kind === "scenario" ? { ...t.types, ...t.scenario.types } : t.types;
      const sizes = boxes(nodes);
      const result = organize({
        cards: nodes.map((n, i) => ({ id: n.id, type: n.data.type, width: sizes[i].width, height: sizes[i].height })),
        plan,
        sceneIds: planScenes(nodes),
        labels: {
          groups: Object.fromEntries(Object.entries(types).map(([k, v]) => [k, v.section])) as Record<CardType, string>,
          beat: (key) => t.plan.beats[key as keyof typeof t.plan.beats]?.label ?? key,
          chapter: (n, title) => (title ? fmt(t.chapters.numberedTitle, { n, title }) : fmt(t.chapters.numbered, { n })),
          unplaced: t.plan.unplaced,
          story: types.scene.section,
        },
        origin: { x: Math.min(...sizes.map((b) => b.x)), y: Math.min(...sizes.map((b) => b.y)) },
        newId,
      });
      // Une seule étape d'historique : Ctrl/Cmd+Z remet le canevas tel qu'il était.
      record();
      let nextEdges = edges;
      const linked = (a: string, b: string) => nextEdges.some((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
      for (const [source, target] of result.sequence) {
        if (linked(source, target)) continue;
        nextEdges = addEdge({ id: newId(), source, target, sourceHandle: null, targetHandle: null, label: t.chapters.next, type: "floating" }, nextEdges);
      }
      set({
        nodes: nodes.map((n) => {
          const at = result.positions.get(n.id);
          return at ? { ...n, position: at, selected: false } : n;
        }),
        // Les cadres d'avant se vidaient : ils sont remplacés par ceux du rangement.
        frames: result.frames.map(toFrameNode),
        edges: nextEdges,
        view: "toile",
        fitRequest: Date.now(),
      });
      touch();
    },
    paper: "letter",
    paperChosen: false,
    setPaper: (paper) => {
      set({ paper, paperChosen: true });
      touch();
    },
    sceneNumbers: false,
    setSceneNumbers: (sceneNumbers) => {
      set({ sceneNumbers });
      touch();
    },
    focusMode: false,
    setFocusMode: (focusMode) => set({ focusMode }),
    nodes: [],
    edges: [],
    screenplay: null,
    savedScreenplay: null,
    setScreenplay: (screenplay, undoable = false) => {
      if (undoable) record();
      else forgetHistory();
      set({ screenplay, nodes: titlesFromHeadings(get().nodes, screenplay) });
      touch();
    },
    setTitlePageField: (field, value) => {
      const { screenplay, title } = get();
      if (!screenplay) return null;
      const before = readTitleField(screenplay.titlePage, field);
      let titlePage = writeTitleField(screenplay.titlePage, field, value);
      if (titlePage === screenplay.titlePage) return screenplay;
      // Premier nom d'auteur : la mention « Écrit par » se pose toute seule (on peut la changer ou l'effacer).
      if (field === "author" && !before && !readTitleField(titlePage, "credit")) {
        titlePage = writeTitleField(titlePage, "credit", getT().screenplay.titlePage.creditDefault);
      }
      if (field === "author") useSettings.getState().setAuthor(readTitleField(titlePage, "author"));
      const next = { ...screenplay, titlePage };
      const renamed = field === "title" && before.trim() === title.trim() && readTitleField(titlePage, "title") !== "";
      forgetHistory();
      set(renamed ? { screenplay: next, title: readTitleField(titlePage, "title") } : { screenplay: next });
      touch();
      return next;
    },
    past: [],
    future: [],
    undo: () => restore("past"),
    redo: () => restore("future"),
    revealCard: (id) => {
      if (!get().nodes.some((n) => n.id === id)) return;
      set({ view: "toile", focusId: id, nodes: get().nodes.map((n) => ({ ...n, selected: n.id === id })) });
    },
    view: "toile",
    focusId: null,
    pendingFocusId: null,
    clearPendingFocus: () => set({ pendingFocusId: null }),
    status: "enregistre",
    loaded: false,
    screen: "home",
    projects: [],
    homeNotice: false,

    start: async () => {
      await refreshProjects();
      set({ loaded: true, screen: "home" });
    },

    openProject: async (id) => {
      storage.select(id);
      set({ openFailed: false, homeNotice: false });
      try {
        const files = await storage.readAll();
        // Dossier vidé ou déplacé depuis la dernière fois : on reste à l'accueil, avec un message.
        if (!files || !openFiles(files)) set({ homeNotice: true });
      } catch (err) {
        console.error(err);
        storage.forget();
        set({ openFailed: true });
      }
    },

    createProject: async ({ title, kind }) => {
      if (!(await storage.create())) return;
      // L'emplacement choisi contient déjà un projet : on l'ouvre, on ne l'écrase pas.
      const existing = await storage.readAll().catch(() => null);
      if (existing && openFiles(existing)) return;
      const { state } = openProject({ meta: { version: 1, title, kind, layout: [], links: [] }, cards: [], screenplay: null });
      set({
        ...state,
        lastFiles: {},
        screen: "project",
        view: "toile",
        focusId: null,
        openFailed: false,
        homeNotice: false,
        status: "modifie",
      });
      await get().save();
    },

    importNotice: null,
    importScreenplay: async () => {
      set({ importNotice: null, homeNotice: false, openFailed: false });
      const t = getT();
      let file: { name: string; text: string } | null = null;
      try {
        file = await storage.pickTextFile(t.home.fountainFiles, ["fountain", "spmd", "txt"]);
      } catch (err) {
        console.error(err);
        set({ importNotice: "empty" });
        return;
      }
      if (!file) return;
      const project = importFountain(file.text, {
        fileName: file.name,
        locale: useSettings.getState().lang,
        linkLabel: t.screenplay.linkSetIn,
        newId,
      });
      if (!project.screenplay || project.screenplay.elements.length === 0) {
        set({ importNotice: "empty" });
        return;
      }
      if (!(await storage.create())) return;
      // Jamais d'import par-dessus un projet existant : l'auteur choisit un dossier vide.
      if (await storage.readAll().catch(() => null)) {
        storage.forget();
        set({ importNotice: "taken" });
        return;
      }
      const { state } = openProject(project);
      set({
        ...state,
        savedScreenplay: null,
        lastFiles: {},
        screen: "project",
        view: "manuscrit",
        focusId: null,
        status: "modifie",
      });
      await get().save();
    },

    tryExample: async () => {
      if (!(await storage.create())) return;
      await get().load();
      if (get().screen === "project" && get().status === "modifie") await get().save();
    },

    closeProject: async (force = false) => {
      if (!force) {
        // On retente aussi après un échec : la cause a pu disparaître (disque rebranché).
        if (get().status !== "enregistre") await get().save();
        // Toujours en échec : le projet reste à l'écran, un message propose de réessayer ou de quitter quand même.
        if (get().status === "erreur") return;
      }
      await refreshProjects();
      set({ screen: "home", focusMode: false });
    },

    unlistProject: async (id) => {
      storage.unlist(id);
      await refreshProjects();
    },
    openFailed: false,
    dismissOpenFailed: () => set({ openFailed: false }),
    lastFiles: {},

    frames: [],
    addFrame: (center) => {
      record();
      const chosen = get().nodes.filter((n) => n.selected);
      let frame: Frame;
      if (chosen.length > 0) {
        // Autour des cartes sélectionnées.
        const around = boxes(chosen);
        const left = Math.min(...around.map((b) => b.x)) - FRAME_PADDING.side;
        const top = Math.min(...around.map((b) => b.y)) - FRAME_PADDING.top;
        const right = Math.max(...around.map((b) => b.x + b.width)) + FRAME_PADDING.side;
        const bottom = Math.max(...around.map((b) => b.y + b.height)) + FRAME_PADDING.bottom;
        frame = { id: newId(), title: "", x: left, y: top, width: right - left, height: bottom - top };
      } else {
        frame = {
          id: newId(),
          title: "",
          x: Math.round(center.x - FRAME_SIZE.width / 2),
          y: Math.round(center.y - FRAME_SIZE.height / 2),
          ...FRAME_SIZE,
        };
      }
      set({ frames: [...get().frames.map((f) => ({ ...f, selected: false })), { ...toFrameNode(frame), selected: true }] });
      touch();
      return frame.id;
    },
    updateFrame: (id, patch) => {
      record(`frame:${id}:title`);
      set({ frames: get().frames.map((f) => (f.id === id ? { ...f, data: { ...f.data, ...patch } } : f)) });
      touch();
    },
    deleteFrame: (id) => {
      record();
      set({ frames: get().frames.filter((f) => f.id !== id) });
      touch();
    },
    onNodesChange: (changes) => {
      const frameIds = new Set(get().frames.map((f) => f.id));
      const isFrame = (c: NodeChange<CardNode | FrameNode>) => "id" in c && frameIds.has(c.id);
      const frameChanges = changes.filter(isFrame) as NodeChange<FrameNode>[];
      const cardChanges = changes.filter((c) => !isFrame(c)) as NodeChange<CardNode>[];

      // Sélection et mesure ne modifient pas le projet, et n'entrent pas dans l'historique.
      const removed = cardChanges.filter((c) => c.type === "remove").map((c) => c.id);
      const widened = new Map<string, number>();
      for (const c of cardChanges) {
        if (c.type === "dimensions" && c.resizing !== undefined && c.dimensions) widened.set(c.id, c.dimensions.width);
      }
      const resized = widened.size > 0 || frameChanges.some((c) => c.type === "dimensions" && c.resizing !== undefined);
      const changed =
        resized || changes.some((c) => c.type === "position" || c.type === "remove") || cardChanges.some((c) => c.type === "dimensions");
      if (changes.some((c) => c.type === "remove")) record();
      else if (resized) record("resize");
      else if (changes.some((c) => c.type === "position")) record("move");

      // Un cadre qu'on déplace emmène les cartes qu'il contient (leur centre est dedans).
      // Pas quand on le redimensionne par le haut ou la gauche : sa position change, pas son contenu.
      let nodes = get().nodes;
      const frames = get().frames;
      const carried = new Map<string, { x: number; y: number }>();
      for (const change of frameChanges) {
        if (change.type !== "position" || !change.position) continue;
        if (frameChanges.some((c) => c.type === "dimensions" && c.id === change.id)) continue;
        const frame = get().frames.find((f) => f.id === change.id);
        if (!frame) continue;
        const box = frameBox(frame);
        const dx = change.position.x - box.x;
        const dy = change.position.y - box.y;
        if (dx === 0 && dy === 0) continue;
        nodes = nodes.map((n) => {
          const [card] = boxes([n]);
          const cx = card.x + card.width / 2;
          const cy = card.y + card.height / 2;
          const inside = cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height;
          return inside ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n;
        });
        // Et les cadres qu'il contient entièrement (un chapitre dans une case du gabarit).
        for (const inner of frames) {
          if (inner.id === frame.id || frameChanges.some((c) => "id" in c && c.id === inner.id)) continue;
          const b = frameBox(inner);
          if (b.x >= box.x && b.y >= box.y && b.x + b.width <= box.x + box.width && b.y + b.height <= box.y + box.height) {
            carried.set(inner.id, { x: b.x + dx, y: b.y + dy });
          }
        }
      }

      let { screenplay } = get();
      // Carte supprimée au clavier (Suppr) : même règle que le bouton ×, son lien avec le scénario est défait.
      if (screenplay) for (const id of removed) screenplay = releaseCard(screenplay, id);
      let nextNodes = applyNodeChanges(cardChanges, nodes);
      // Carte élargie par son bord : seule la largeur est retenue, la hauteur suit toujours le contenu.
      if (widened.size > 0) {
        nextNodes = nextNodes.map((n) => {
          const width = widened.get(n.id);
          if (width === undefined) return n;
          const { width: _w, height: _h, ...rest } = n;
          return { ...rest, style: { ...n.style, width: clampCardWidth(width) } };
        });
      }
      let nextFrames = frameChanges.length > 0 ? applyNodeChanges(frameChanges, frames) : frames;
      if (carried.size > 0) nextFrames = nextFrames.map((f) => (carried.has(f.id) ? { ...f, position: carried.get(f.id)! } : f));
      set({ nodes: nextNodes, frames: nextFrames, screenplay });
      if (changed) touch();
    },
    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) record();
      set({ edges: applyEdgeChanges(changes, get().edges) });
      if (changes.some((c) => c.type === "remove")) touch();
    },
    onConnect: (c) => {
      record();
      // Les fils sont "flottants" : on ignore les points de connexion utilisés pour les tirer.
      const edge = { source: c.source, target: c.target, sourceHandle: null, targetHandle: null };
      set({ edges: addEdge({ ...edge, id: newId(), label: "", type: "floating" }, get().edges) });
      touch();
    },

    addCard: (pos, type = "idee", height = CARD_SIZE.height) => {
      record();
      const card: CardData = { id: newId(), type, title: "", html: "" };
      // À l'endroit demandé s'il est libre, sinon juste à côté : deux cartes ne se chevauchent pas.
      const spot = freeSpot(pos, boxes(get().nodes), { width: CARD_SIZE.width, height });
      const node = { ...toNode(card, spot.x, spot.y), selected: true };
      set({ nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), node], pendingFocusId: card.id });
      touch();
      return card.id;
    },
    addTitledCard: (type, title) => {
      record();
      const card: CardData = { id: newId(), type, title, html: "" };
      const spot = firstFreeCell(boxes(get().nodes));
      set({ nodes: [...get().nodes, toNode(card, spot.x, spot.y)] });
      touch();
      return card.id;
    },
    toggleLink: (a, b) => {
      const between = (e: Edge) => (e.source === a && e.target === b) || (e.source === b && e.target === a);
      if (!get().edges.some(between)) return get().linkCards(a, b, "");
      record();
      set({ edges: get().edges.filter((e) => !between(e)) });
      touch();
    },
    linkCards: (source, target, label) => {
      const linked = get().edges.some(
        (e) => (e.source === source && e.target === target) || (e.source === target && e.target === source),
      );
      if (linked || source === target) return;
      record();
      const edge = { source, target, sourceHandle: null, targetHandle: null };
      set({ edges: addEdge({ ...edge, id: newId(), label, type: "floating" }, get().edges) });
      touch();
    },
    updateCard: (id, patch) => {
      // Les lettres d'un titre ou d'un texte tapées d'affilée ne font qu'une étape d'historique.
      // Un changement de type ou d'image est toujours une étape à part.
      const keys = Object.keys(patch);
      const typed = keys.length === 1 && (keys[0] === "title" || keys[0] === "html");
      record(typed ? `card:${id}:${keys[0]}` : "");
      let nodes = get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
      // Les mentions de cette carte, dans les autres, suivent son nouveau titre.
      const { title } = patch;
      if (typeof title === "string") nodes = nodes.map((n) => withHtml(n, renameMentions(n.data.html, id, title)));
      let { screenplay } = get();
      const card = nodes.find((n) => n.id === id)?.data;
      if (screenplay && card) {
        const linked = headingTitles(screenplay).has(id);
        // Une carte qui n'est plus une Scène quitte le scénario (son texte, s'il y en a, y reste).
        if (card.type !== "scene") screenplay = releaseCard(screenplay, id);
        // Scénario : une carte Scène qui reçoit un titre y entre aussitôt, à la suite des autres.
        else if (!linked && get().kind === "scenario") screenplay = appendScene(screenplay, { id, title: card.title });
        // Sinon son en-tête suit son titre.
        else if (typeof patch.title === "string") screenplay = renameHeading(screenplay, id, patch.title);
      }
      set({ nodes, screenplay });
      touch();
    },
    resizeCard: (id, delta) => {
      record(`card:${id}:width`);
      set({
        nodes: get().nodes.map((n) => {
          if (n.id !== id) return n;
          const width = typeof n.style?.width === "number" ? n.style.width : CARD_WIDTH;
          return { ...n, style: { ...n.style, width: clampCardWidth(width + delta) } };
        }),
      });
      touch();
    },
    setCardImage: async (id, file) => {
      const ext = imageExtension(file.name);
      if (!ext || !get().nodes.some((n) => n.id === id)) return false;
      // Un nom neuf dans medias/ : deux images du même nom ne s'écrasent pas, et annuler reste possible.
      const name = `${newId()}.${ext}`;
      try {
        await storage.writeMedia(name, file.data);
      } catch (err) {
        console.error(err);
        return false;
      }
      get().updateCard(id, { image: name });
      return true;
    },
    addImageCard: async (pos, file) => {
      if (!imageExtension(file.name)) return null;
      // La place de l'image est réservée d'avance, pour ne pas recouvrir une voisine une fois l'image affichée.
      const id = get().addCard(pos, "idee", CARD_SIZE.height + IMAGE_ROOM);
      set({ pendingFocusId: null });
      if (await get().setCardImage(id, file)) return id;
      // La copie a échoué : pas de carte vide laissée derrière.
      get().undo();
      return null;
    },
    pickCardImage: async (id) => {
      const file = await storage.pickImage(getT().card.imageFiles).catch((err) => {
        console.error(err);
        return null;
      });
      if (file) await get().setCardImage(id, file);
    },
    addGalleryImages: async (id, given) => {
      const files = (given ?? (await storage.pickImages(getT().card.imageFiles).catch(() => []))).filter((f) => imageExtension(f.name));
      const names: string[] = [];
      for (const file of files) {
        const name = `${newId()}.${imageExtension(file.name)}`;
        try {
          await storage.writeMedia(name, file.data);
          names.push(name);
        } catch (err) {
          console.error(err);
        }
      }
      const card = get().nodes.find((n) => n.id === id)?.data;
      if (!card || names.length === 0) return 0;
      // Pas encore d'image principale : la première photo la devient.
      const [first, ...rest] = card.image ? [undefined, ...names] : names;
      get().updateCard(id, { ...(first ? { image: first } : {}), images: [...(card.images ?? []), ...rest] });
      return names.length;
    },
    removeGalleryImage: (id, name) => {
      const card = get().nodes.find((n) => n.id === id)?.data;
      if (!card?.images?.includes(name)) return;
      const images = card.images.filter((n) => n !== name);
      get().updateCard(id, { images: images.length > 0 ? images : undefined });
    },
    useAsMainImage: (id, name) => {
      const card = get().nodes.find((n) => n.id === id)?.data;
      if (!card?.images?.includes(name)) return;
      const images = card.images.map((n) => (n === name ? card.image : n)).filter((n): n is string => !!n);
      get().updateCard(id, { image: name, images: images.length > 0 ? images : undefined });
    },
    deleteCard: (id) => {
      record();
      const { screenplay } = get();
      set({
        // Ses mentions dans les autres cartes redeviennent du texte : le nom reste écrit.
        nodes: get().nodes.filter((n) => n.id !== id).map((n) => withHtml(n, removeMentions(n.data.html, id))),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
        // Le texte de la scène reste dans le scénario ; un en-tête encore sans texte part avec sa carte.
        screenplay: screenplay && releaseCard(screenplay, id),
      });
      touch();
    },
    renameLink: (id, label) => {
      record(`link:${id}`);
      set({ edges: get().edges.map((e) => (e.id === id ? { ...e, label } : e)) });
      touch();
    },

    setView: (view, focusId = null) => set({ view, focusId }),

    load: async () => {
      let files: FileMap | null = null;
      let failed = false;
      try {
        files = await storage.readAll();
      } catch (err) {
        // Dossier mémorisé illisible (accès refusé, disque absent) : l'app s'ouvre quand même,
        // et l'auteur choisit à nouveau son dossier. Sans cela, elle resterait sur « Ouverture… ».
        console.error(err);
        storage.forget();
        failed = true;
      }
      // Après un échec, on reste à l'accueil : l'auteur choisit à nouveau son dossier.
      if (failed) {
        set({ loaded: true, openFailed: true, screen: "home" });
        return;
      }
      const { state, dirty } = openProject((files && deserialize(files)) || demoProject());
      set({
        ...state,
        lastFiles: files ?? {},
        loaded: true,
        screen: "project",
        view: "toile",
        focusId: null,
        openFailed: false,
        homeNotice: false,
        status: files !== null && !dirty ? "enregistre" : "modifie",
      });
      if (files) storage.remember({ title: state.title, kind: state.kind });
    },

    openFolder: async () => {
      if (!(await storage.pickFolder())) return;
      try {
        const files = await storage.readAll();
        // Un dossier sans projet ne s'ouvre pas : pour en démarrer un, c'est « Nouveau projet ».
        if (!files || !openFiles(files)) set({ homeNotice: true, openFailed: false });
      } catch (err) {
        console.error(err);
        storage.forget();
        set({ openFailed: true });
      }
    },

    save: async () => {
      if (storage.canPickFolder && !storage.location()) {
        if (!(await storage.pickFolder())) return;
        // Le dossier choisi contient déjà un projet : on l'ouvre, on ne l'écrase jamais
        // avec ce qui est à l'écran (le projet d'exemple, le plus souvent).
        const existing = await storage.readAll().catch(() => null);
        if (existing && openFiles(existing)) return;
      }
      const { screenplay, savedScreenplay } = get();
      const files = serialize(toProject(get()));
      const prev = get().lastFiles;
      // Scénario inchangé depuis le disque : on garde le fichier tel quel, à l'octet près
      // (il peut venir d'un autre logiciel, que la sérialisation normaliserait).
      if (screenplay && screenplay === savedScreenplay && SCREENPLAY_FILE in prev) {
        files[SCREENPLAY_FILE] = prev[SCREENPLAY_FILE];
      }
      const changed: FileMap = {};
      for (const [path, content] of Object.entries(files)) if (prev[path] !== content) changed[path] = content;
      const removed = Object.keys(prev).filter((path) => !(path in files));
      set({ status: "enregistrement" });
      try {
        await storage.write(changed, removed);
        // Si l'auteur a modifié quelque chose pendant l'écriture, on reste "modifié".
        set({
          lastFiles: files,
          savedScreenplay: screenplay,
          status: get().status === "enregistrement" ? "enregistre" : get().status,
        });
        storage.remember({ title: get().title, kind: get().kind });
      } catch (err) {
        console.error(err);
        set({ status: "erreur" });
      }
    },
  };
});
