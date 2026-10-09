// La zone « Recherche » du canevas : un cadre marqué (`kind: "research"` dans cosmos.json) où atterrissent
// les sources collées ou déposées (liens, extraits, images). Fonctions pures, testées.

import { CARD_SIZE, type Box } from "./placement";

const GAP = 24;
/** Marge intérieure d'un cadre : plus haute en tête, pour son titre. */
const PAD = { side: 32, top: 64, bottom: 32 };
/** Colonnes d'un cadre Recherche neuf. */
const COLUMNS = 3;

/** Un cadre Recherche neuf, à droite de tout ce qui est déjà sur le canevas. */
export function newResearchBox(existing: Box[]): Box {
  const width = PAD.side * 2 + COLUMNS * CARD_SIZE.width + (COLUMNS - 1) * GAP;
  const height = PAD.top + PAD.bottom + CARD_SIZE.height * 2 + GAP;
  if (existing.length === 0) return { x: 0, y: 0, width, height };
  const right = Math.max(...existing.map((b) => b.x + b.width));
  const top = Math.min(...existing.map((b) => b.y));
  return { x: Math.round(right + 160), y: Math.round(top), width, height };
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width + GAP && b.x < a.x + a.width + GAP && a.y < b.y + b.height + GAP && b.y < a.y + a.height + GAP;

/**
 * Où poser une nouvelle carte dans le cadre : la première case libre, de gauche à droite puis de haut en bas.
 * Si le cadre est plein, la carte va sur une nouvelle rangée et le cadre s'agrandit (`frame` rendu).
 */
export function researchSpot(frame: Box, cards: Box[], size = CARD_SIZE): { spot: { x: number; y: number }; frame: Box } {
  const columns = Math.max(1, Math.floor((frame.width - PAD.side * 2 + GAP) / (size.width + GAP)));
  const inside = cards.filter((c) => c.x + c.width / 2 >= frame.x && c.x + c.width / 2 <= frame.x + frame.width && c.y + c.height / 2 >= frame.y && c.y + c.height / 2 <= frame.y + frame.height);
  for (let row = 0; row < 200; row++) {
    for (let col = 0; col < columns; col++) {
      const spot = { x: frame.x + PAD.side + col * (size.width + GAP), y: frame.y + PAD.top + row * (size.height + GAP) };
      if (inside.some((c) => overlaps({ ...spot, ...size }, c))) continue;
      const bottom = spot.y + size.height + PAD.bottom;
      return { spot, frame: bottom > frame.y + frame.height ? { ...frame, height: bottom - frame.y } : frame };
    }
  }
  return { spot: { x: frame.x + PAD.side, y: frame.y + frame.height }, frame };
}

/** Nom du site d'une adresse, sans « www. ». */
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** La date du jour, pour « consultée le » (format de la langue de l'interface). */
export const today = (lang: string, date = new Date()) => new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(date);

const absolute = (href: string, base: string) => {
  if (!href.trim()) return "";
  try {
    const url = new URL(href.trim(), base || undefined);
    return /^https?:$/.test(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

/** Ce qu'une page web dit d'elle-même : titre, site, auteur, date (balises <title> et <meta>). */
export function pageInfo(html: string, base = ""): { title: string; site: string; author: string; published: string; image: string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const meta = (...names: string[]) => {
    for (const name of names) {
      const value = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute("content")?.trim();
      if (value) return value;
    }
    return "";
  };
  const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300);
  return {
    title: clean(meta("og:title", "twitter:title") || doc.querySelector("title")?.textContent || ""),
    site: clean(meta("og:site_name", "application-name")),
    author: clean(meta("author", "article:author", "dc.creator")),
    published: clean(meta("article:published_time", "date", "dc.date").slice(0, 10)),
    // Image de partage du site (og:image), en adresse absolue, seulement en http(s).
    image: absolute(meta("og:image:secure_url", "og:image", "twitter:image", "twitter:image:src") || doc.querySelector('link[rel="image_src"]')?.getAttribute("href") || "", base),
  };
}
