// Ce qui vient d'être écrit dans le scénario alimente le canevas : un en-tête de scène validé
// (suivi d'un autre élément) reçoit sa carte Scène, un personnage qui parle reçoit sa carte
// Personnage s'il n'en a pas.
// Seuls les éléments écrits dans cette session sont concernés (attribut « known » absent) : une carte
// supprimée exprès n'est pas recréée, et un fichier venu d'ailleurs n'est pas transformé en cartes d'office.

import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { characterName } from "../scenes";
import { matchesCharacter, titleCase } from "./autocomplete";

export interface AdoptHost {
  /** Crée une carte sur le canevas et rend son identifiant. */
  addCard: (type: "scene" | "personnage", title: string) => string;
  /** Titres des cartes Personnage existantes (relus à chaque appel). */
  characterCards: () => string[];
  locale: string;
}

/** Meta de la transaction qui pose les liens : ce n'est pas une frappe, rien à reconvertir pour elle. */
export const ADOPT_META = "cosmos:adopt";

/** Rend le document mis à jour, ou null s'il n'y avait rien à adopter. */
export function adoptNew(editor: Editor, host: AdoptHost): PMNode | null {
  const { doc } = editor.state;
  const tr = editor.state.tr;
  doc.forEach((node, offset, index) => {
    const type = node.type.name;
    const text = node.textContent.trim();
    if ((type !== "sceneHeading" && type !== "character") || node.attrs.known || text === "") return;
    const next = index + 1 < doc.childCount ? doc.child(index + 1).type.name : null;
    if (type === "sceneHeading" && next) {
      // Un en-tête encore seul en fin de texte est peut-être en cours de frappe : on attend la suite.
      const cardId = (node.attrs.cardId as string | null) || host.addCard("scene", text);
      tr.setNodeMarkup(offset, null, { ...node.attrs, cardId, known: true });
    }
    if (type === "character" && (next === "dialogue" || next === "parenthetical")) {
      const name = characterName(text);
      if (name && !host.characterCards().some((title) => matchesCharacter(title, name))) {
        host.addCard("personnage", titleCase(name, host.locale));
      }
      tr.setNodeMarkup(offset, null, { ...node.attrs, known: true });
    }
  });
  if (!tr.docChanged) return null;
  editor.view.dispatch(tr.setMeta("addToHistory", false).setMeta(ADOPT_META, true));
  return editor.state.doc;
}
