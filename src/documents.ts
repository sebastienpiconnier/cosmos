// Cartes Document (PDF importés) : ce qui ne dépend pas de pdf.js. Fonctions pures.

/** Année d'une date PDF (« D:20190314… ») ; vide si elle n'est pas lisible. */
export function pdfDate(raw: string): string {
  const m = /^(?:D:)?(\d{4})/.exec(raw.trim());
  if (!m) return "";
  const year = Number(m[1]);
  return year >= 1900 && year <= 2200 ? m[1] : "";
}

/** Titre d'un document : celui que le fichier déclare s'il a l'air d'un vrai titre, sinon son nom sans extension. */
export function documentTitle(declared: string, fileName: string): string {
  const name = fileName.replace(/\.[A-Za-z0-9]+$/, "").replace(/[_]+/g, " ").trim();
  const title = declared.trim();
  // Titres que les logiciels écrivent d'eux-mêmes : « Microsoft Word - brouillon.docx », « untitled »…
  if (!title || /^(untitled|sans titre|document\d*)$/i.test(title) || /\.(docx?|odt|pages|rtf|txt|indd|pdf)$/i.test(title)) return name;
  return title;
}

/** Fiche d'un document importé : seulement ce qui est connu (aucun champ vide). */
export function documentFiche(info: { pages: number; author: string; year: string }): Record<string, string> {
  return {
    ...(info.author ? { auteur: info.author } : {}),
    ...(info.year ? { publication: info.year } : {}),
    ...(info.pages > 0 ? { pages: String(info.pages) } : {}),
  };
}
