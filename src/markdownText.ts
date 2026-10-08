// Collage de Markdown : un texte brut qui ressemble à du Markdown (titres, listes, gras, italique, cases
// à cocher, liens, citations) est converti en texte mis en forme au lieu d'être collé tel quel.
// Fonction pure, testée. La conversion elle-même passe par markdownToHtml (donc par sanitizeHtml).

const PATTERNS = [
  /^#{1,6}\s+\S/m, // titre
  /^\s*[-*+]\s+\S/m, // liste à puces
  /^\s*\d+[.)]\s+\S/m, // liste numérotée
  /^\s*[-*+]\s+\[[ xX]\]\s/m, // case à cocher
  /^>\s?\S/m, // citation
  /\*\*[^*\n]+\*\*/, // gras
  /__[^_\n]+__/,
  /(^|[\s(])\*[^*\s][^*\n]*\*(?=[\s).,;:!?]|$)/m, // italique
  /(^|[\s(])_[^_\s][^_\n]*_(?=[\s).,;:!?]|$)/m,
  /\[[^\]\n]+\]\([^)\s]+\)/, // lien
  /~~[^~\n]+~~/, // barré
  /==[^=\n]+==/, // à reprendre
];

/** Le texte collé contient-il de la mise en forme Markdown ? */
export const looksLikeMarkdown = (text: string) => PATTERNS.some((re) => re.test(text));

/** `==texte==` (« à reprendre ») n'est pas du Markdown standard : il devient une balise <mark>. */
export const markHighlights = (text: string) => text.replace(/==([^=\n]+)==/g, "<mark>$1</mark>");
