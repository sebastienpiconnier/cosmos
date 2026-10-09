// « Organiser le canevas » : range toutes les cartes en groupes encadrés, d'après leur type et le plan.
// Fonction pure : elle calcule des positions et des cadres, le store les applique en une seule étape
// d'historique (Ctrl/Cmd+Z remet tout comme avant).
//
//   Personnages · Intrigues · Lieux · Thèmes · Questions   (une rangée de cadres)
//   Récit : [case du gabarit [chapitre [scènes]]]   (une case par ligne ; sans gabarit, les chapitres)
//   Idées en vrac · Images · Liens
//
// Les scènes sont reliées dans l'ordre du récit (un fil « puis » entre deux scènes qui se suivent).

import type { CardType, Frame } from "./types";
import { PLAN_TEMPLATES, arrange, chapterNumbers, groupByChapter, type Plan } from "./plan";

export interface OrganizeCard {
  id: string;
  type: CardType;
  width: number;
  height: number;
}

export interface OrganizeLabels {
  /** Titre du cadre de chaque type (« Personnages »…). */
  groups: Record<CardType, string>;
  /** Titre du cadre d'une case de gabarit. */
  beat: (key: string) => string;
  /** Titre du cadre d'un chapitre : numéro et titre éventuel. */
  chapter: (n: number, title: string) => string;
  /** Scènes pas encore rangées dans une case. */
  unplaced: string;
  /** Cadre de toutes les scènes, quand le plan est libre et sans chapitre. */
  story: string;
}

export interface OrganizeInput {
  cards: OrganizeCard[];
  plan: Plan;
  /** Cartes Scène dans l'ordre par défaut (celui du canevas), comme pour les fonctions de plan.ts. */
  sceneIds: string[];
  labels: OrganizeLabels;
  /** Coin haut gauche de l'ensemble. */
  origin: { x: number; y: number };
  newId: () => string;
}

export interface OrganizeResult {
  positions: Map<string, { x: number; y: number }>;
  frames: Frame[];
  /** Fils à tirer entre scènes qui se suivent : [source, cible]. */
  sequence: [string, string][];
}

const GAP = 32; // entre deux cartes
const GROUP_GAP = 56; // entre deux cadres
const ROW_GAP = 96; // entre deux rangées de l'ensemble
const PAD = { side: 32, top: 64, bottom: 32 }; // marge intérieure d'un cadre (titre en haut)

type Item =
  | { kind: "card"; id: string; width: number; height: number }
  | { kind: "frame"; title: string; body: Layout }
  | { kind: "box"; body: Layout }; // groupe sans cadre

interface Layout {
  items: Item[];
  /** Nombre d'éléments par ligne (lecture de gauche à droite, puis de haut en bas). */
  columns: number;
  gap: number;
}

interface Sized {
  width: number;
  height: number;
}

function size(item: Item): Sized {
  if (item.kind === "card") return { width: item.width, height: item.height };
  const inner = layoutSize(item.body);
  return item.kind === "box" ? inner : { width: inner.width + PAD.side * 2, height: inner.height + PAD.top + PAD.bottom };
}

/** Largeur de chaque colonne et hauteur de chaque ligne d'une grille. */
function grid(layout: Layout) {
  const sizes = layout.items.map(size);
  const columns = Math.max(1, Math.min(layout.columns, sizes.length));
  const widths = Array.from({ length: columns }, (_, c) => Math.max(0, ...sizes.filter((_, i) => i % columns === c).map((s) => s.width)));
  const rows = Math.ceil(sizes.length / columns);
  const heights = Array.from({ length: rows }, (_, r) => Math.max(0, ...sizes.slice(r * columns, (r + 1) * columns).map((s) => s.height)));
  return { sizes, columns, widths, heights };
}

function layoutSize(layout: Layout): Sized {
  if (layout.items.length === 0) return { width: 240, height: 80 };
  const { widths, heights } = grid(layout);
  return {
    width: widths.reduce((a, b) => a + b, 0) + layout.gap * (widths.length - 1),
    height: heights.reduce((a, b) => a + b, 0) + layout.gap * (heights.length - 1),
  };
}

function place(layout: Layout, x: number, y: number, out: OrganizeResult, newId: () => string) {
  const { columns, widths, heights } = grid(layout);
  layout.items.forEach((item, i) => {
    const c = i % columns;
    const r = Math.floor(i / columns);
    const ix = x + widths.slice(0, c).reduce((a, b) => a + b, 0) + layout.gap * c;
    const iy = y + heights.slice(0, r).reduce((a, b) => a + b, 0) + layout.gap * r;
    if (item.kind === "card") {
      out.positions.set(item.id, { x: Math.round(ix), y: Math.round(iy) });
    } else if (item.kind === "box") {
      place(item.body, ix, iy, out, newId);
    } else {
      const s = size(item);
      // Le cadre extérieur d'abord : il se dessine derrière ceux qu'il contient.
      out.frames.push({ id: newId(), title: item.title, x: Math.round(ix), y: Math.round(iy), width: Math.round(s.width), height: Math.round(s.height) });
      place(item.body, ix + PAD.side, iy + PAD.top, out, newId);
    }
  });
}

export function organize({ cards, plan, sceneIds, labels, origin, newId }: OrganizeInput): OrganizeResult {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const cardItem = (id: string): Item[] => {
    const c = byId.get(id);
    return c ? [{ kind: "card", id: c.id, width: c.width, height: c.height }] : [];
  };
  const ofType = (type: CardType) => cards.filter((c) => c.type === type).map((c) => c.id);
  const typeFrame = (type: CardType, columns: number): Item[] => {
    const ids = ofType(type);
    return ids.length > 0 ? [{ kind: "frame", title: labels.groups[type], body: { items: ids.flatMap(cardItem), columns, gap: GAP } }] : [];
  };

  // Récit : les scènes dans les cases du gabarit, regroupées par chapitre.
  const scenes = sceneIds.filter((id) => byId.get(id)?.type === "scene");
  const { beats, unplaced } = arrange(plan, scenes);
  const order = [...beats.flatMap((b) => b.ids), ...unplaced];
  const numbers = chapterNumbers(plan, order);
  const chaptered = (ids: string[]): Item[] =>
    groupByChapter(plan, ids).map((g): Item => {
      const body: Layout = { items: g.ids.flatMap(cardItem), columns: 3, gap: GAP };
      return g.chapter ? { kind: "frame", title: labels.chapter(numbers.get(g.chapter.id) ?? 0, g.chapter.title.trim()), body } : { kind: "box", body };
    });
  const free = plan.template === "libre" || PLAN_TEMPLATES[plan.template].length <= 1;
  let story: Item[];
  if (free) {
    const groups = chaptered(beats[0]?.ids ?? []);
    const anyChapter = groups.some((g) => g.kind === "frame");
    story = groups.length === 0 ? [] : anyChapter ? groups : [{ kind: "frame", title: labels.story, body: { items: groups, columns: 1, gap: GAP } }];
  } else {
    story = beats
      .filter((b) => b.ids.length > 0)
      .map((b): Item => ({ kind: "frame", title: labels.beat(b.key), body: { items: chaptered(b.ids), columns: 3, gap: GROUP_GAP } }));
    if (unplaced.length > 0) story.push({ kind: "frame", title: labels.unplaced, body: { items: unplaced.flatMap(cardItem), columns: 4, gap: GAP } });
  }

  const rows: Layout[] = [
    {
      items: [...typeFrame("personnage", 3), ...typeFrame("intrigue", 2), ...typeFrame("lieu", 2), ...typeFrame("theme", 2), ...typeFrame("question", 2)],
      columns: 5,
      gap: GROUP_GAP,
    },
    // Sans gabarit, les chapitres se suivent de gauche à droite ; avec, une case par ligne.
    { items: story, columns: free ? 3 : 1, gap: GROUP_GAP },
    // Idées en vrac, puis les images et les liens collés sur le canevas.
    { items: [...typeFrame("idee", 4), ...typeFrame("image", 3), ...typeFrame("lien", 3)], columns: 3, gap: GROUP_GAP },
  ].filter((r) => r.items.length > 0);

  const out: OrganizeResult = { positions: new Map(), frames: [], sequence: [] };
  let y = origin.y;
  for (const row of rows) {
    place(row, origin.x, y, out, newId);
    y += layoutSize(row).height + ROW_GAP;
  }

  // Les scènes rangées se suivent : un fil de chacune à la suivante.
  const told = free ? order : beats.flatMap((b) => b.ids);
  for (let i = 1; i < told.length; i++) out.sequence.push([told[i - 1], told[i]]);
  return out;
}
