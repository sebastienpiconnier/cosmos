// PDF des cartes Document : lecture par pdf.js (aperçu de la première page, nombre de pages, titre et
// auteur), et rendu des pages dans la liseuse. Chargé seulement à la demande (import dynamique), car
// pdf.js pèse lourd. Version « legacy » : elle tourne aussi dans les WebKit plus anciens (app Mac, iOS).

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { pdfDate } from "./documents";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDoc = pdfjs.PDFDocumentProxy;

/** Ouvre un PDF depuis ses octets (copiés : pdf.js les transfère à son worker). */
export function openPdf(data: Uint8Array): Promise<PdfDoc> {
  // Les polices absentes du fichier sont remplacées par celles du système (pdf.js n'utilise plus eval).
  return pdfjs.getDocument({ data: data.slice(), useSystemFonts: true }).promise;
}

/** Dessine une page dans un canvas, à la largeur donnée (en pixels CSS), nette sur un écran dense. */
export async function renderPage(doc: PdfDoc, n: number, canvas: HTMLCanvasElement, width: number): Promise<void> {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const viewport = page.getViewport({ scale: (width / base.width) * ratio });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  // Largeur seulement : la hauteur suit la proportion, même quand la fenêtre rétrécit la page.
  canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
  const context = canvas.getContext("2d");
  if (!context) return;
  await page.render({ canvas, canvasContext: context, viewport }).promise;
}

export interface PdfInfo {
  pages: number;
  title: string;
  author: string;
  /** Année de création, si le fichier la donne. */
  year: string;
  /** Première page en JPEG (aperçu de la carte), ou null si elle n'a pas pu être dessinée. */
  thumbnail: Uint8Array | null;
}

/** Ce que la carte retient d'un PDF : son aperçu et ce que le fichier dit de lui-même. */
export async function readPdf(data: Uint8Array): Promise<PdfInfo> {
  const doc = await openPdf(data);
  try {
    const meta = await doc.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as Record<string, unknown>;
    const text = (key: string) => (typeof info[key] === "string" ? (info[key] as string).trim() : "");
    let thumbnail: Uint8Array | null = null;
    try {
      const canvas = document.createElement("canvas");
      await renderPage(doc, 1, canvas, 480 / Math.min(2, window.devicePixelRatio || 1));
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (blob) thumbnail = new Uint8Array(await blob.arrayBuffer());
    } catch (err) {
      console.error(err);
    }
    return { pages: doc.numPages, title: text("Title"), author: text("Author"), year: pdfDate(text("CreationDate")), thumbnail };
  } finally {
    void doc.loadingTask.destroy();
  }
}
