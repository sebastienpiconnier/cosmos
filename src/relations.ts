// Carte des relations d'une Bible : les personnages en portraits, reliés par les fils du canevas.
// Aucune donnée propre : ce sont les fils (et leurs étiquettes) entre deux cartes Personnage. Fonctions pures.

import type { CardData, Link } from "./types";

export interface RelationNode {
  id: string;
  x: number;
  y: number;
  /** Nombre de relations, pour la taille du portrait. */
  degree: number;
}

export interface RelationEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface RelationMap {
  nodes: RelationNode[];
  edges: RelationEdge[];
  width: number;
  height: number;
  /** Personnage placé au centre, s'il y en a un. */
  hub: string | null;
}

const MARGIN = 90;

/**
 * Disposition : le personnage le plus relié au centre (s'il a au moins deux relations et qu'il y a au
 * moins quatre personnages), les autres en cercle autour, rangés pour que les reliés soient voisins.
 * Le cercle grandit avec le nombre de personnages.
 */
export function relationMap(cards: Pick<CardData, "id" | "type" | "title">[], links: Pick<Link, "id" | "source" | "target" | "label">[], lang = "fr"): RelationMap {
  const people = cards.filter((c) => c.type === "personnage").sort((a, b) => a.title.localeCompare(b.title, lang));
  const ids = new Set(people.map((c) => c.id));
  const edges = links
    .filter((l) => l.source !== l.target && ids.has(l.source) && ids.has(l.target))
    .map((l) => ({ id: l.id, source: l.source, target: l.target, label: String(l.label ?? "").trim() }));
  const degree = new Map(people.map((c) => [c.id, 0]));
  for (const e of edges) {
    degree.set(e.source, degree.get(e.source)! + 1);
    degree.set(e.target, degree.get(e.target)! + 1);
  }
  if (people.length === 0) return { nodes: [], edges: [], width: 0, height: 0, hub: null };

  const ranked = [...people].sort((a, b) => degree.get(b.id)! - degree.get(a.id)!);
  const hub = people.length >= 4 && degree.get(ranked[0].id)! >= 2 ? ranked[0].id : null;
  const ring = orderRing(people.map((c) => c.id).filter((id) => id !== hub), edges);

  const radius = ring.length <= 1 ? 0 : Math.max(150, (ring.length * 130) / (2 * Math.PI));
  const size = 2 * (radius + MARGIN);
  const center = size / 2;
  const nodes: RelationNode[] = [];
  if (hub) nodes.push({ id: hub, x: center, y: center, degree: degree.get(hub)! });
  ring.forEach((id, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / ring.length;
    nodes.push({ id, x: Math.round(center + radius * Math.cos(angle)), y: Math.round(center + radius * Math.sin(angle)), degree: degree.get(id)! });
  });
  return { nodes, edges, width: size, height: size, hub };
}

/** Ordre autour du cercle : on suit les relations (parcours en profondeur), pour rapprocher les reliés. */
function orderRing(ids: string[], edges: RelationEdge[]): string[] {
  const neighbours = new Map(ids.map((id) => [id, [] as string[]]));
  for (const e of edges) {
    neighbours.get(e.source)?.push(e.target);
    neighbours.get(e.target)?.push(e.source);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  const visit = (id: string) => {
    if (seen.has(id) || !neighbours.has(id)) return;
    seen.add(id);
    out.push(id);
    for (const n of neighbours.get(id)!) visit(n);
  };
  for (const id of ids) visit(id);
  return out;
}

/** Point où un fil quitte le cercle d'un portrait de rayon r, en direction de (tx, ty). */
export function edgePoint(x: number, y: number, tx: number, ty: number, r: number): { x: number; y: number } {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: x + (dx / d) * r, y: y + (dy / d) * r };
}

/** Images de tout le projet, pour le tableau d'ambiance : principale puis galerie, par type puis par titre. */
export function moodImages(cards: Pick<CardData, "id" | "type" | "title" | "image" | "images">[], order: readonly string[], lang = "fr"): { cardId: string; name: string; type: CardData["type"]; title: string }[] {
  const rank = (t: string) => {
    const i = order.indexOf(t);
    return i < 0 ? order.length : i;
  };
  return [...cards]
    .sort((a, b) => rank(a.type) - rank(b.type) || a.title.localeCompare(b.title, lang))
    .flatMap((c) => [...new Set([c.image, ...(c.images ?? [])].filter((n): n is string => !!n))].map((name) => ({ cardId: c.id, name, type: c.type, title: c.title })));
}
