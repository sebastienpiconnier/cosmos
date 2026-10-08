// Coller sur le canevas (hors d'un champ) : un lien ou un texte devient une carte, pour garder la trace
// d'une recherche. Fonctions pures, testées. Le texte passe ensuite par markdownToHtml / sanitizeHtml.

export interface Clip {
  /** Titre proposé (le site, pour un lien). */
  title: string;
  /** Contenu en Markdown. */
  markdown: string;
}

const URL_RE = /^https?:\/\/[^\s<>"]+$/i;

export function clipFromText(raw: string): Clip | null {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return null;
  if (URL_RE.test(text)) {
    let host = "";
    try {
      host = new URL(text).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
    return { title: host, markdown: `<${text}>` };
  }
  // Un texte copié d'ailleurs : gardé tel quel, en citation (Markdown déjà présent compris).
  return { title: "", markdown: text.split("\n").map((l) => (l.trim() ? `> ${l}` : ">")).join("\n") };
}
