// Coller sur le canevas (hors d'un champ) : un lien ou un texte devient une carte, pour garder la trace
// d'une recherche. Fonctions pures, testées. Le texte passe ensuite par markdownToHtml / sanitizeHtml.

export interface Clip {
  /** Titre proposé (le site, pour un lien). */
  title: string;
  /** Adresse de la source, pour un lien. */
  url?: string;
  /** Contenu en Markdown. */
  markdown: string;
}

const URL_RE = /^https?:\/\/[^\s<>"]+$/i;

/** Un lien copié traîne parfois une ponctuation ou un guillemet (`'`, `"`, `»`, `)`, `.`) : on les retire. */
const trimLink = (text: string) => text.replace(/^[\s'"«“‘(<]+/, "").replace(/[\s'"»”’)>.,;]+$/, "");

export function clipFromText(raw: string): Clip | null {
  let text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return null;
  const link = trimLink(text);
  if (!/\s/.test(link) && URL_RE.test(link)) text = link;
  if (URL_RE.test(text)) {
    let host = "";
    try {
      host = new URL(text).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
    return { title: host, url: text, markdown: "" };
  }
  // Un texte copié d'ailleurs : gardé tel quel, en citation (Markdown déjà présent compris).
  return { title: "", markdown: text.split("\n").map((l) => (l.trim() ? `> ${l}` : ">")).join("\n") };
}
