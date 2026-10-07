// Conversion entre une carte (en mémoire) et un fichier Markdown avec frontmatter.
//
// Exemple de fichier cartes/<id>.md :
// ---
// id: k3x9a
// type: personnage
// title: "Inès Morvan"
// image: k3x9a7bq2m.jpg     (facultatif : un fichier du dossier medias/)
// ---
// Gardienne remplaçante. Ne supporte pas le **silence**.
// Elle remplace [@Yann Le Goff](cosmos:p4t8w2zq1c).     (mention d'une autre carte)

import { marked } from "marked";
import TurndownService from "turndown";
import { CARD_TYPES, type CardData, type CardType } from "../types";
import { isMediaName } from "../media";
import { MENTION_SCHEME, mentionTarget } from "../mentions";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", emDelimiter: "*" });
// Une mention s'écrit comme un lien Markdown vers la carte citée.
turndown.addRule("mention", {
  filter: (node) => node.nodeName === "SPAN" && !!node.getAttribute("data-mention"),
  replacement: (content, node) => `[${content}](${MENTION_SCHEME}${(node as HTMLElement).getAttribute("data-mention")})`,
});

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
      // Lien vers une carte : il devient une mention (seul attribut gardé : un identifiant vérifié).
      const mention = child.tagName === "A" ? mentionTarget(child.getAttribute("href")) : null;
      if (mention) {
        const span = doc.createElement("span");
        span.setAttribute("data-mention", mention);
        span.textContent = child.textContent;
        child.replaceWith(span);
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
    ...(card.image ? [`image: ${card.image}`] : []),
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
  const type = (CARD_TYPES.includes(fields.type as CardType) ? fields.type : "idee") as CardType;
  const card: CardData = { id: fields.id, type, title, html: markdownToHtml(m[2]) };
  // Le nom vient du disque : on n'accepte qu'un simple nom de fichier image, jamais un chemin.
  if (isMediaName(fields.image)) card.image = fields.image;
  return card;
}
