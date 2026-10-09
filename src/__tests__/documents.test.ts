// @vitest-environment happy-dom
// Cartes Document : le PDF dans medias/, son nom dans l'en-tête de la carte, jamais un chemin.

import { beforeEach, describe, expect, it } from "vitest";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { storage } from "../storage";
import { cardToFile, fileToCard } from "../storage/markdown";
import { documentFiche, documentTitle, pdfDate } from "../documents";
import { isDocumentName, mimeOf } from "../media";

const state = () => useCosmos.getState();
const PDF = new TextEncoder().encode("%PDF-1.4\n% pas un vrai PDF\n");

beforeEach(async () => {
  localStorage.clear();
  useSettings.setState({ lang: "fr" });
  useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, paperChosen: false, lastFiles: {}, past: [], future: [], trash: [], trashNotice: null });
  await state().start();
  await state().createProject({ title: "Essai", kind: "roman" });
});

describe("cartes Document", () => {
  it("ce que le PDF dit de lui-même : titre crédible, année lisible, fiche sans champ vide", () => {
    expect(pdfDate("D:20190314120000+01'00'")).toBe("2019");
    expect(pdfDate("n'importe quoi")).toBe("");
    expect(documentTitle("Microsoft Word - brouillon.docx", "Repérages_Bretagne.pdf")).toBe("Repérages Bretagne");
    expect(documentTitle("Le phare de Kerlaouen", "x.pdf")).toBe("Le phare de Kerlaouen");
    expect(documentTitle("", "notes.pdf")).toBe("notes");
    expect(documentFiche({ pages: 12, author: "", year: "2019" })).toEqual({ publication: "2019", pages: "12" });
    expect(mimeOf("a.pdf")).toBe("application/pdf");
  });

  it("le fichier de la carte : réécrit et relu, refusé s'il ressemble à un chemin", () => {
    const card = { id: "d1", type: "document" as const, title: "Repérages", html: "", fichier: "d1.pdf", image: "d1.jpg", fiche: { pages: "3" } };
    const back = fileToCard(cardToFile(card))!;
    expect(back).toMatchObject({ type: "document", fichier: "d1.pdf", image: "d1.jpg", fiche: { pages: "3" } });
    expect(cardToFile(back)).toBe(cardToFile(card));
    expect(fileToCard("---\nid: d2\ntype: document\ntitle: \"x\"\nfichier: ../../secret.pdf\n---\n")!.fichier).toBeUndefined();
    expect(isDocumentName("a.pdf")).toBe(true);
    expect(isDocumentName("a.jpg")).toBe(false);
  });

  it("importer un PDF : une carte Document, le fichier copié dans medias/ ; un PDF illisible est gardé sans aperçu", async () => {
    const id = (await state().addDocument({ name: "Carnet_de_repérage.pdf", data: PDF }))!;
    const card = state().nodes.find((n) => n.id === id)!.data;
    expect(card).toMatchObject({ type: "document", title: "Carnet de repérage" });
    expect(card.fichier).toMatch(/\.pdf$/);
    expect(await storage.readMedia(card.fichier!)).toEqual(PDF);
    expect(await state().addDocument({ name: "photo.jpg", data: PDF })).toBeNull();
  });

  it("une carte vide qui reçoit un PDF devient ce Document, sans perdre ce que l'auteur a écrit", async () => {
    const id = state().addCard({ x: 0, y: 0 });
    state().updateCard(id, { type: "document", title: "Mes notes" });
    expect(await state().setCardDocument(id, { name: "scan.pdf", data: PDF })).toBe(true);
    const card = state().nodes.find((n) => n.id === id)!.data;
    expect(card).toMatchObject({ type: "document", title: "Mes notes" });
    expect(card.fichier).toBeTruthy();
    state().openDocument(id);
    expect(state()).toMatchObject({ dialog: "document", documentCard: id });
  });
});
