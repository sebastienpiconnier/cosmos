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
import { SCREENPLAY_FILE, deserialize, serialize, storage, type FileMap } from "./storage";
import type { Screenplay } from "./screenplay/model";
import { isPaper, type Paper } from "./screenplay/layout";
import { headingTitles, initialScreenplay, renameHeading, unlinkCard, type SceneCard } from "./screenplay/link";
import { getT } from "./i18n";

export type CardNode = Node<CardData, "card">;
export type View = "toile" | "plan" | "bible" | "manuscrit";
export type SaveStatus = "enregistre" | "modifie" | "enregistrement" | "erreur";

export const CARD_WIDTH = 240;

interface CosmosState {
  title: string;
  kind: ProjectKind;
  setKind: (kind: ProjectKind) => void;
  /** Format de page du scénario (estimation des pages, puis PDF). */
  paper: Paper;
  setPaper: (paper: Paper) => void;
  nodes: CardNode[];
  edges: Edge[];
  /** Texte du scénario (scenario.fountain). null tant que le projet n'a jamais été un scénario. */
  screenplay: Screenplay | null;
  /** Le scénario tel qu'il est sur disque : tant qu'il n'a pas changé, le fichier n'est pas réécrit. */
  savedScreenplay: Screenplay | null;
  /** Remplace le scénario (éditeur). Les titres des cartes liées suivent leurs en-têtes. */
  setScreenplay: (screenplay: Screenplay) => void;
  view: View;
  focusId: string | null;
  /** Carte qui vient d'être créée : son éditeur prend le focus dès qu'il est prêt. */
  pendingFocusId: string | null;
  clearPendingFocus: () => void;
  status: SaveStatus;
  loaded: boolean;
  lastFiles: FileMap;

  onNodesChange: (changes: NodeChange<CardNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (c: Connection) => void;

  addCard: (pos: { x: number; y: number }, type?: CardType) => string;
  /** Carte créée depuis une autre vue que la toile : posée sous les autres, sans prendre le focus. */
  addTitledCard: (type: CardType, title: string) => string;
  /** Tire un fil étiqueté entre deux cartes, s'il n'y en a pas déjà un. */
  linkCards: (source: string, target: string, label: string) => void;
  updateCard: (id: string, patch: Partial<Omit<CardData, "id">>) => void;
  deleteCard: (id: string) => void;
  renameLink: (id: string, label: string) => void;

  setView: (view: View, focusId?: string | null) => void;
  load: () => Promise<void>;
  openFolder: () => Promise<void>;
  save: () => Promise<void>;
}

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
  const paper: Paper = isPaper(p.meta.paper) ? p.meta.paper : "letter";
  return { title: p.meta.title, kind, paper, nodes, edges };
}

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
  return {
    state: { ...base, nodes, screenplay, savedScreenplay: p.screenplay },
    dirty: screenplay !== p.screenplay || nodes !== base.nodes,
  };
}

function toProject(s: Pick<CosmosState, "title" | "kind" | "paper" | "nodes" | "edges" | "screenplay">): Project {
  return {
    meta: {
      version: 1,
      title: s.title,
      kind: s.kind,
      // Le format par défaut ne s'écrit pas : cosmos.json reste identique pour qui n'y touche pas.
      ...(s.paper !== "letter" ? { paper: s.paper } : {}),
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

  return {
    title: "",
    kind: "roman",
    setKind: (kind) => {
      const { screenplay, title, nodes } = get();
      // Premier passage en scénario : un en-tête par carte Scène. Le retour en roman ne supprime rien.
      if (kind === "scenario" && !screenplay) set({ kind, screenplay: initialScreenplay(title, sceneCards(nodes)) });
      else set({ kind });
      touch();
    },
    paper: "letter",
    setPaper: (paper) => {
      set({ paper });
      touch();
    },
    nodes: [],
    edges: [],
    screenplay: null,
    savedScreenplay: null,
    setScreenplay: (screenplay) => {
      set({ screenplay, nodes: titlesFromHeadings(get().nodes, screenplay) });
      touch();
    },
    view: "toile",
    focusId: null,
    pendingFocusId: null,
    clearPendingFocus: () => set({ pendingFocusId: null }),
    status: "enregistre",
    loaded: false,
    lastFiles: {},

    onNodesChange: (changes) => {
      set({ nodes: applyNodeChanges(changes, get().nodes) });
      // Sélection et mesure ne modifient pas le projet.
      if (changes.some((c) => c.type === "position" || c.type === "remove" || c.type === "dimensions")) touch();
    },
    onEdgesChange: (changes) => {
      set({ edges: applyEdgeChanges(changes, get().edges) });
      if (changes.some((c) => c.type === "remove")) touch();
    },
    onConnect: (c) => {
      // Les fils sont "flottants" : on ignore les points de connexion utilisés pour les tirer.
      const edge = { source: c.source, target: c.target, sourceHandle: null, targetHandle: null };
      set({ edges: addEdge({ ...edge, id: newId(), label: "", type: "floating" }, get().edges) });
      touch();
    },

    addCard: (pos, type = "idee") => {
      const card: CardData = { id: newId(), type, title: "", html: "" };
      const node = { ...toNode(card, pos.x, pos.y), selected: true };
      set({ nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), node], pendingFocusId: card.id });
      touch();
      return card.id;
    },
    addTitledCard: (type, title) => {
      const card: CardData = { id: newId(), type, title, html: "" };
      const lowest = get().nodes.reduce((y, n) => Math.max(y, n.position.y), -140);
      set({ nodes: [...get().nodes, toNode(card, 80, lowest + 220)] });
      touch();
      return card.id;
    },
    linkCards: (source, target, label) => {
      const linked = get().edges.some(
        (e) => (e.source === source && e.target === target) || (e.source === target && e.target === source),
      );
      if (linked || source === target) return;
      const edge = { source, target, sourceHandle: null, targetHandle: null };
      set({ edges: addEdge({ ...edge, id: newId(), label, type: "floating" }, get().edges) });
      touch();
    },
    updateCard: (id, patch) => {
      const nodes = get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
      let { screenplay } = get();
      const card = nodes.find((n) => n.id === id)?.data;
      if (screenplay && card) {
        // Une carte qui n'est plus une Scène perd son lien ; sinon son en-tête suit son titre.
        if (card.type !== "scene") screenplay = unlinkCard(screenplay, id);
        else if (typeof patch.title === "string") screenplay = renameHeading(screenplay, id, patch.title);
      }
      set({ nodes, screenplay });
      touch();
    },
    deleteCard: (id) => {
      const { screenplay } = get();
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
        // Le texte de la scène reste dans le scénario : seule la note de lien est retirée.
        screenplay: screenplay && unlinkCard(screenplay, id),
      });
      touch();
    },
    renameLink: (id, label) => {
      set({ edges: get().edges.map((e) => (e.id === id ? { ...e, label } : e)) });
      touch();
    },

    setView: (view, focusId = null) => set({ view, focusId }),

    load: async () => {
      const files = await storage.readAll();
      const { state, dirty } = openProject((files && deserialize(files)) || demoProject());
      set({ ...state, lastFiles: files ?? {}, loaded: true, status: files && !dirty ? "enregistre" : "modifie" });
    },

    openFolder: async () => {
      if (!(await storage.pickFolder())) return;
      const files = await storage.readAll();
      if (files) {
        const project = deserialize(files);
        if (project) {
          const { state, dirty } = openProject(project);
          set({ ...state, lastFiles: files, status: dirty ? "modifie" : "enregistre" });
        }
      } else {
        // Dossier vide : on y enregistre le projet courant.
        set({ lastFiles: {}, status: "modifie" });
        await get().save();
      }
    },

    save: async () => {
      if (storage.canPickFolder && !storage.location()) {
        if (!(await storage.pickFolder())) return;
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
      } catch (err) {
        console.error(err);
        set({ status: "erreur" });
      }
    },
  };
});
