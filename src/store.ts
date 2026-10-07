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
import { isProjectKind, type CardData, type CardType, type Project, type ProjectKind } from "./types";
import { SCREENPLAY_FILE, deserialize, serialize, storage, type FileMap, type ProjectEntry } from "./storage";
import type { Screenplay } from "./screenplay/model";
import { defaultPaper, isPaper, type Paper } from "./screenplay/layout";
import { useSettings } from "./settings";
import { importFountain } from "./screenplay/import";
import { CARD_SIZE, firstFreeCell, freeSpot, type Box } from "./placement";
import {
  appendScene,
  headingTitles,
  initialScreenplay,
  releaseCard,
  renameHeading,
  type SceneCard,
} from "./screenplay/link";
import { getT } from "./i18n";

export type CardNode = Node<CardData, "card">;
export type View = "toile" | "plan" | "bible" | "manuscrit";
export type SaveStatus = "enregistre" | "modifie" | "enregistrement" | "erreur";

export const CARD_WIDTH = 240;

interface CosmosState {
  title: string;
  kind: ProjectKind;
  setKind: (kind: ProjectKind) => void;
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

  onNodesChange: (changes: NodeChange<CardNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (c: Connection) => void;

  addCard: (pos: { x: number; y: number }, type?: CardType) => string;
  /** Carte créée depuis une autre vue (Bible, scénario) : posée sur la première place libre, sans prendre le focus. */
  addTitledCard: (type: CardType, title: string) => string;
  /** Tire un fil étiqueté entre deux cartes, s'il n'y en a pas déjà un. */
  linkCards: (source: string, target: string, label: string) => void;
  updateCard: (id: string, patch: Partial<Omit<CardData, "id">>) => void;
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
  edges: Edge[];
  screenplay: Screenplay | null;
}

const HISTORY_LIMIT = 100;
/** Deux gestes de même nature rapprochés (lettres d'un titre, déplacement) ne font qu'une étape. */
const HISTORY_MERGE_MS = 800;

const newId = () => nanoid(10);

const toNode = (card: CardData, x: number, y: number, width = CARD_WIDTH): CardNode => ({
  id: card.id,
  type: "card",
  position: { x, y },
  data: card,
  style: { width },
  dragHandle: ".card-handle",
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
  return { title: p.meta.title, kind, paper, paperChosen, sceneNumbers: p.meta.sceneNumbers === true, nodes, edges };
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

/** État à adopter quand on ouvre un projet. `dirty` : l'ouverture a produit des changements à enregistrer. */
function openProject(p: Project) {
  const base = fromProject(p);
  // Projet scénario sans fichier (créé avant l'éditeur) : on le prépare à partir des cartes Scène.
  const screenplay =
    p.screenplay ?? (base.kind === "scenario" ? initialScreenplay(base.title, sceneCards(base.nodes)) : null);
  const nodes = screenplay ? titlesFromHeadings(base.nodes, screenplay) : base.nodes;
  // Un scénario fixe son format de page une fois pour toutes (selon la langue du moment), pour que
  // la pagination ne change pas d'un appareil à l'autre.
  const paperChosen = base.paperChosen || base.kind === "scenario";
  return {
    // Un projet qu'on ouvre repart d'un historique vide.
    state: { ...base, paperChosen, nodes, screenplay, savedScreenplay: p.screenplay, past: [], future: [] },
    dirty: screenplay !== p.screenplay || nodes !== base.nodes || paperChosen !== base.paperChosen,
  };
}

function toProject(
  s: Pick<CosmosState, "title" | "kind" | "paper" | "paperChosen" | "sceneNumbers" | "nodes" | "edges" | "screenplay">,
): Project {
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
    },
    cards: s.nodes.map((n) => n.data),
    screenplay: s.screenplay,
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
    const { nodes, edges, screenplay, past } = get();
    set({ past: [...past.slice(-(HISTORY_LIMIT - 1)), { nodes, edges, screenplay }], future: [] });
  };
  const forgetHistory = () => {
    lastTag = "";
    if (get().past.length > 0 || get().future.length > 0) set({ past: [], future: [] });
  };
  const restore = (from: "past" | "future") => {
    const { past, future, nodes, edges, screenplay } = get();
    const stack = from === "past" ? past : future;
    const target = stack[stack.length - 1];
    if (!target) return;
    lastTag = "";
    const here: Snapshot = { nodes, edges, screenplay };
    set({
      past: from === "past" ? past.slice(0, -1) : [...past, here],
      future: from === "past" ? [...future, here] : future.slice(0, -1),
      nodes: target.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: target.edges,
      screenplay: target.screenplay,
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
      if (kind === "scenario" && !screenplay) set({ kind, screenplay: initialScreenplay(title, sceneCards(nodes)) });
      else set({ kind });
      // Et un format de page : A4 si l'interface est en français, US Letter sinon.
      if (kind === "scenario" && !paperChosen) set({ paper: defaultPaper(useSettings.getState().lang), paperChosen: true });
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

    onNodesChange: (changes) => {
      // Sélection et mesure ne modifient pas le projet, et n'entrent pas dans l'historique.
      const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
      if (removed.length > 0) record();
      else if (changes.some((c) => c.type === "position")) record("move");
      let { screenplay } = get();
      // Carte supprimée au clavier (Suppr) : même règle que le bouton ×, son lien avec le scénario est défait.
      if (screenplay) for (const id of removed) screenplay = releaseCard(screenplay, id);
      set({ nodes: applyNodeChanges(changes, get().nodes), screenplay });
      if (changes.some((c) => c.type === "position" || c.type === "remove" || c.type === "dimensions")) touch();
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

    addCard: (pos, type = "idee") => {
      record();
      const card: CardData = { id: newId(), type, title: "", html: "" };
      // À l'endroit demandé s'il est libre, sinon juste à côté : deux cartes ne se chevauchent pas.
      const spot = freeSpot(pos, boxes(get().nodes));
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
      record(`card:${id}:${Object.keys(patch).sort().join(",")}`);
      const nodes = get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
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
    deleteCard: (id) => {
      record();
      const { screenplay } = get();
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
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
