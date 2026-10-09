// Document à exporter (manuscrit ou bible d'un projet), indépendant du format de sortie.
// Les exports (Markdown, Word, EPUB, PDF) partent tous de ce modèle : un titre, un auteur, des chapitres
// faits de blocs simples. Le HTML des cartes et du manuscrit est lu ici, une seule fois.

import type { CardData, CardType, Link } from "../types";
import { BIBLE_ORDER } from "../types";
import { isBlank, type Manuscript } from "../manuscript";
import { ficheText, sheetFields } from "../character";
import { PITCH_CHIPS, PITCH_TEXTS, type Pitch } from "../pitch";

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type Block =
  | { kind: "heading"; runs: Run[] }
  | { kind: "paragraph"; runs: Run[]; quote?: boolean; list?: "bullet" | "number"; index?: number };

export interface Chapter {
  title: string;
  blocks: Block[];
}

export interface ExportDoc {
  title: string;
  /** Vide si l'auteur n'a pas donné son nom. */
  author: string;
  /** Langue du texte (balise BCP 47), pour les formats qui la déclarent. */
  lang: string;
  chapters: Chapter[];
  /** Manuscrit : alinéa en début de paragraphe dans le PDF. */
  indent?: boolean;
}

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE", "UL", "OL", "PRE", "DIV"]);

/** Texte mis en forme d'un élément : gras, italique, retours à la ligne. Les mentions perdent leur « @ ». */
function runsOf(el: Element, style: { bold?: boolean; italic?: boolean } = {}): Run[] {
  const runs: Run[] = [];
  const push = (text: string, s: typeof style) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && !!last.bold === !!s.bold && !!last.italic === !!s.italic) last.text += text;
    else runs.push({ text, ...(s.bold ? { bold: true } : {}), ...(s.italic ? { italic: true } : {}) });
  };
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) {
      push((node.textContent ?? "").replace(/\s+/g, " "), style);
    } else if (node.nodeType === 1) {
      const child = node as Element;
      if (child.tagName === "BR") push("\n", style);
      else if (BLOCK_TAGS.has(child.tagName)) continue; // un bloc imbriqué est lu à part
      else if (child.hasAttribute("data-mention")) push((child.textContent ?? "").replace(/^@/, ""), style);
      else {
        const next = {
          bold: style.bold || child.tagName === "STRONG" || child.tagName === "B",
          italic: style.italic || child.tagName === "EM" || child.tagName === "I",
        };
        for (const run of runsOf(child, next)) push(run.text, run);
      }
    }
  }
  return runs;
}

const trimRuns = (runs: Run[]): Run[] => {
  const out = runs.map((r) => ({ ...r }));
  if (out.length > 0) {
    out[0].text = out[0].text.replace(/^\s+/, "");
    out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, "");
  }
  return out.filter((r) => r.text !== "");
};

/** HTML d'une carte ou d'une scène (déjà nettoyé) → blocs. */
export function htmlToBlocks(html: string | undefined): Block[] {
  if (!html) return [];
  const body = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
  const blocks: Block[] = [];
  const walk = (el: Element, context: { quote?: boolean; list?: "bullet" | "number" }) => {
    let index = 0;
    for (const child of Array.from(el.children)) {
      const tag = child.tagName;
      if (tag === "UL" || tag === "OL") walk(child, { ...context, list: tag === "OL" ? "number" : "bullet" });
      else if (tag === "BLOCKQUOTE") walk(child, { ...context, quote: true });
      else if (/^H[1-6]$/.test(tag)) {
        const runs = trimRuns(runsOf(child));
        if (runs.length > 0) blocks.push({ kind: "heading", runs });
      } else if (tag === "LI" && child.getAttribute("data-type") === "taskItem") {
        // Case à cocher : ☐ ou ☑ devant le texte.
        const done = child.getAttribute("data-checked") === "true";
        const body = child.querySelector(":scope > div") ?? child;
        const first = body.querySelector(":scope > p") ?? body;
        const runs = trimRuns(runsOf(first));
        if (runs.length > 0) blocks.push({ kind: "paragraph", runs: [{ text: done ? "☑ " : "☐ " }, ...runs], ...(context.quote ? { quote: true } : {}) });
      } else if (tag === "P" || tag === "LI" || tag === "PRE" || tag === "DIV") {
        // L'éditeur écrit <li><p>…</p></li> : le premier paragraphe est le texte de l'élément de liste.
        const inner = tag === "LI" && child.firstElementChild?.tagName === "P" ? child.firstElementChild : null;
        const runs = trimRuns(runsOf(inner ?? child));
        inner?.remove();
        if (runs.length > 0) {
          const item = tag === "LI" && context.list;
          blocks.push({
            kind: "paragraph",
            runs,
            ...(context.quote ? { quote: true } : {}),
            ...(item ? { list: context.list, index: ++index } : {}),
          });
        }
        // Liste imbriquée dans un élément de liste, paragraphes dans un élément de liste.
        if (tag === "LI" || tag === "DIV") walk(child, context);
      }
    }
  };
  walk(body, {});
  // Texte sans balise de bloc (rare) : un seul paragraphe.
  if (blocks.length === 0) {
    const runs = trimRuns(runsOf(body));
    if (runs.length > 0) blocks.push({ kind: "paragraph", runs });
  }
  return blocks;
}

export const runsText = (runs: Run[]) => runs.map((r) => r.text).join("");

export interface DocInfo {
  title: string;
  author: string;
  lang: string;
}

/** Séparateur entre deux scènes d'un même chapitre. */
export const SCENE_BREAK = "* * *";

/**
 * Manuscrit : les scènes écrites, dans l'ordre du plan. Une scène sans texte n'y figure pas.
 * `chapterOf` (facultatif) : le chapitre de chaque scène. Les scènes d'un même chapitre, à la suite,
 * forment un seul chapitre du livre (titre du chapitre, scènes séparées par « * * * ») ; une scène hors
 * chapitre reste un chapitre à elle seule, sous son titre.
 */
export function manuscriptDoc(
  info: DocInfo,
  order: string[],
  cards: CardData[],
  manuscript: Manuscript,
  untitled: string,
  chapterOf?: (sceneId: string) => { id: string; title: string } | null,
): ExportDoc {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const chapters: (Chapter & { key?: string })[] = [];
  for (const id of order.filter((x) => !isBlank(manuscript[x]))) {
    const chapter = chapterOf?.(id) ?? null;
    const last = chapters[chapters.length - 1];
    if (chapter && last?.key === chapter.id) {
      last.blocks.push({ kind: "paragraph", runs: [{ text: SCENE_BREAK }] }, ...htmlToBlocks(manuscript[id]));
    } else if (chapter) {
      chapters.push({ key: chapter.id, title: chapter.title, blocks: htmlToBlocks(manuscript[id]) });
    } else {
      chapters.push({ title: byId.get(id)?.title.trim() || untitled, blocks: htmlToBlocks(manuscript[id]) });
    }
  }
  return { ...info, chapters: chapters.map(({ key: _key, ...c }) => c), indent: true };
}

export interface BibleStrings {
  /** Titre de chaque partie (« Personnages », « Lieux »…). */
  sections: Record<CardType, string>;
  untitled: string;
  linkedTo: string;
  /** Libellés des champs de la fiche d'un personnage (facultatif : sans eux, la fiche n'est pas exportée). */
  fields?: Record<string, string>;
  /** Libellés des types d'arc (la fiche garde une clé : « positif »…). */
  arcTypes?: Record<string, string>;
  /** Couverture du projet : titre de la partie et libellés des champs (sans eux, elle n'est pas exportée). */
  cover?: { title: string; fields: Record<string, string> };
}

/** Couverture du projet en tête de la bible : tagline, pastilles, puis les textes, chacun sous son libellé. */
function coverChapter(pitch: Pitch, cover: NonNullable<BibleStrings["cover"]>): Chapter | null {
  const blocks: Block[] = [];
  if (pitch.tagline?.trim()) blocks.push({ kind: "paragraph", runs: [{ text: pitch.tagline.trim(), italic: true }] });
  for (const key of PITCH_CHIPS) {
    const value = pitch[key]?.trim();
    if (value) blocks.push({ kind: "paragraph", runs: [{ text: `${cover.fields[key] ?? key} : `, bold: true }, { text: value }] });
  }
  for (const key of PITCH_TEXTS) {
    const value = pitch[key]?.trim();
    if (!value || key === "tagline") continue;
    blocks.push({ kind: "heading", runs: [{ text: cover.fields[key] ?? key }] });
    for (const line of value.split(/\n+/).map((l) => l.trim()).filter(Boolean)) blocks.push({ kind: "paragraph", runs: [{ text: line }] });
  }
  return blocks.length > 0 ? { title: cover.title, blocks } : null;
}

/** Bible : une partie par type de carte, une fiche par carte (triées par titre), avec ses liens. */
export function bibleDoc(info: DocInfo, cards: CardData[], links: Pick<Link, "source" | "target" | "label">[], strings: BibleStrings, pitch: Pitch = {}): ExportDoc {
  const titleOf = (id: string) => cards.find((c) => c.id === id)?.title.trim() || strings.untitled;
  const chapters = BIBLE_ORDER.map((type) => {
    const entries = cards.filter((c) => c.type === type).sort((a, b) => a.title.localeCompare(b.title, info.lang));
    const blocks: Block[] = [];
    for (const card of entries) {
      blocks.push({ kind: "heading", runs: [{ text: card.title.trim() || strings.untitled }] });
      // Fiche d'identité d'un personnage : un paragraphe par champ rempli, libellé en gras.
      if (strings.fields && card.fiche) {
        for (const key of sheetFields(card.type)) {
          const value = card.fiche[key]?.trim();
          if (value) blocks.push({ kind: "paragraph", runs: [{ text: `${strings.fields[key] ?? key} : `, bold: true }, { text: ficheText(key, value, strings.arcTypes) }] });
        }
      }
      blocks.push(...htmlToBlocks(card.html).map((b): Block => (b.kind === "heading" ? { kind: "paragraph", runs: b.runs.map((r) => ({ ...r, bold: true })) } : b)));
      const related = links
        .filter((l) => l.source === card.id || l.target === card.id)
        .map((l) => `${titleOf(l.source === card.id ? l.target : l.source)}${l.label ? ` (${l.label})` : ""}`);
      if (related.length > 0) blocks.push({ kind: "paragraph", runs: [{ text: `${strings.linkedTo} : `, italic: true }, { text: related.join(", ") }] });
    }
    return { title: strings.sections[type], blocks };
  }).filter((c) => c.blocks.length > 0);
  const cover = strings.cover ? coverChapter(pitch, strings.cover) : null;
  return { ...info, chapters: cover ? [cover, ...chapters] : chapters };
}
