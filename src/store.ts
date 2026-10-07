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
import type { CardData, CardType, Project } from "./types";
import { deserialize, serialize, storage, type FileMap } from "./storage";

export type CardNode = Node<CardData, "card">;
export type View = "toile" | "plan" | "bible" | "manuscrit";
export type SaveStatus = "enregistre" | "modifie" | "enregistrement" | "erreur";

export const CARD_WIDTH = 240;

interface CosmosState {
  title: string;
  nodes: CardNode[];
  edges: Edge[];
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
  return { title: p.meta.title, nodes, edges };
}

function toProject(s: Pick<CosmosState, "title" | "nodes" | "edges">): Project {
  return {
    meta: {
      version: 1,
      title: s.title,
      layout: s.nodes.map((n) => ({
        id: n.id,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        width: typeof n.style?.width === "number" ? n.style.width : undefined,
      })),
      links: s.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: String(e.label ?? "") })),
    },
    cards: s.nodes.map((n) => n.data),
  };
}

/** Projet d'exemple affiché au premier lancement. */
function demoProject(): Project {
  const ines = newId(), phare = newId(), idee = newId(), scene = newId();
  return {
    meta: {
      version: 1,
      title: "Mon premier projet",
      layout: [
        { id: idee, x: 60, y: 60 },
        { id: ines, x: 120, y: 300 },
        { id: phare, x: 620, y: 120 },
        { id: scene, x: 560, y: 420 },
      ],
      links: [
        { id: newId(), source: ines, target: phare, label: "y travaille" },
        { id: newId(), source: scene, target: phare, label: "se passe à" },
      ],
    },
    cards: [
      { id: idee, type: "idee", title: "", html: "<p>Un phare qui s’allume tout seul chaque 13 du mois ?</p>" },
      { id: ines, type: "personnage", title: "Inès Morvan", html: "<p>Gardienne remplaçante. Ne supporte pas le silence.</p>" },
      { id: phare, type: "lieu", title: "Phare de Kerlaouen", html: "<p>Îlot accessible à marée basse.</p>" },
      { id: scene, type: "scene", title: "Inès trouve le journal de bord", html: "<p>Dernière entrée datée d’après la disparition.</p>" },
    ],
  };
}

export const useCosmos = create<CosmosState>((set, get) => {
  const touch = () => set({ status: "modifie" });

  return {
    title: "",
    nodes: [],
    edges: [],
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
    updateCard: (id, patch) => {
      set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) });
      touch();
    },
    deleteCard: (id) => {
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
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
      const project = (files && deserialize(files)) || demoProject();
      set({ ...fromProject(project), lastFiles: files ?? {}, loaded: true, status: files ? "enregistre" : "modifie" });
    },

    openFolder: async () => {
      if (!(await storage.pickFolder())) return;
      const files = await storage.readAll();
      if (files) {
        const project = deserialize(files);
        if (project) set({ ...fromProject(project), lastFiles: files, status: "enregistre" });
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
      const files = serialize(toProject(get()));
      const prev = get().lastFiles;
      const changed: FileMap = {};
      for (const [path, content] of Object.entries(files)) if (prev[path] !== content) changed[path] = content;
      const removed = Object.keys(prev).filter((path) => !(path in files));
      set({ status: "enregistrement" });
      try {
        await storage.write(changed, removed);
        // Si l'auteur a modifié quelque chose pendant l'écriture, on reste "modifié".
        set({ lastFiles: files, status: get().status === "enregistrement" ? "enregistre" : get().status });
      } catch (err) {
        console.error(err);
        set({ status: "erreur" });
      }
    },
  };
});
