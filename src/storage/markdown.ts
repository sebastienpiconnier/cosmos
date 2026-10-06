// Conversion entre une carte (en mémoire) et un fichier Markdown avec frontmatter.
//
// Exemple de fichier cartes/<id>.md :
// ---
// id: k3x9a
// type: personnage
// title: "Inès Morvan"
// ---
// Gardienne remplaçante. Ne supporte pas le **silence**.

import { marked } from "marked";
import TurndownService from "turndown";
import { CARD_TYPES, type CardData, type CardType } from "../types";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", emDelimiter: "*" });

export function htmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") return "";
  return turndown.turndown(html).trim();
}

export function markdownToHtml(md: string): string {
  if (!md.trim()) return "";
  return sanitizeHtml(marked.parse(md, { async: false }) as string);
}

// Les fichiers .md viennent du disque : on ne garde que les balises de mise en forme
// pour qu'un fichier piégé ne puisse pas injecter de script dans l'app.
const ALLOWED = new Set([
  "P", "BR", "HR", "STRONG", "B", "EM", "I", "S", "DEL", "CODE", "PRE", "BLOCKQUOTE",
  "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "A",
]);

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const clean = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE"].includes(child.tagName)) {
        child.remove();
        continue;
      }
      clean(child); // descendants d'abord, puis l'élément lui-même
      if (!ALLOWED.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const keep = child.tagName === "A" && attr.name === "href" && /^https?:\/\//i.test(attr.value);
        if (!keep) child.removeAttribute(attr.name);
      }
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}

export function cardToFile(card: CardData): string {
  const front = [
    "---",
    `id: ${card.id}`,
    `type: ${card.type}`,
    `title: ${JSON.stringify(card.title)}`,
    "---",
  ].join("\n");
  return `${front}\n${htmlToMarkdown(card.html)}\n`;
}

const FRONT_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function fileToCard(text: string): CardData | null {
  const m = text.replace(/\r\n/g, "\n").match(FRONT_RE);
  if (!m) return null;
  const fields: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!fields.id) return null;
  let title = fields.title ?? "";
  try {
    title = JSON.parse(title);
  } catch {
    /* titre non quoté : on le garde tel quel */
  }
  const type = (CARD_TYPES.some((c) => c.type === fields.type) ? fields.type : "idee") as CardType;
  return { id: fields.id, type, title, html: markdownToHtml(m[2]) };
}
