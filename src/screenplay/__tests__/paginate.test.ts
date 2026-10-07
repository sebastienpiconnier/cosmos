// Estimation des pages : gabarit, comptage de lignes, règles de bas de page.

import { describe, expect, it } from "vitest";
import type { ScreenplayElement } from "../model";
import { LAYOUTS, columnsFor } from "../layout";
import { pagesBetween, paginate, wrappedLines } from "../paginate";
import { parse } from "../parse";
import courtFr from "./fixtures/court-fr.fountain?raw";
import torture from "./fixtures/torture.fountain?raw";

const letter = LAYOUTS.letter;
const a4 = LAYOUTS.a4;
const action = (text: string): ScreenplayElement => ({ type: "action", text });
/** Un paragraphe d'action d'exactement `n` lignes. */
const block = (n: number) => action(Array.from({ length: n }, () => "x").join("\n"));

describe("gabarit", () => {
  it("Letter : 60 caractères d'action, 55 lignes ; A4 : 57 caractères, 59 lignes", () => {
    expect(letter.columns).toEqual({ action: 60, character: 38, parenthetical: 25, dialogue: 35 });
    expect(letter.linesPerPage).toBe(55);
    expect(a4.columns.action).toBe(57);
    expect(a4.linesPerPage).toBe(59);
    expect(a4.columns.dialogue).toBe(35);
  });

  it("largeur par élément ; rien pour ce qui ne s'imprime pas", () => {
    expect(columnsFor("sceneHeading", letter)).toBe(60);
    expect(columnsFor("transition", letter)).toBe(60);
    expect(columnsFor("centered", letter)).toBe(60);
    expect(columnsFor("dialogue", letter)).toBe(35);
    for (const type of ["note", "boneyard", "section", "synopsis", "pageBreak"] as const) {
      expect(columnsFor(type, letter)).toBe(0);
    }
  });
});

describe("lignes d'un texte", () => {
  it("coupe aux mots", () => {
    expect(wrappedLines("", 10)).toBe(1);
    expect(wrappedLines("dix lettres", 11)).toBe(1);
    expect(wrappedLines("dix lettres", 10)).toBe(2);
    expect(wrappedLines("un deux trois quatre", 10)).toBe(3);
  });

  it("compte les retours à la ligne et coupe un mot trop long", () => {
    expect(wrappedLines("un\ndeux\n\ntrois", 10)).toBe(4);
    expect(wrappedLines("abcdefghijklmnopqrstuvwxyz", 10)).toBe(3);
    expect(wrappedLines("ab abcdefghijklmnopqrstuvwxyz", 10)).toBe(4);
  });
});

describe("fixtures", () => {
  it("scénario court en français : 29 lignes, une page", () => {
    const { elements } = parse(courtFr);
    const result = paginate(elements, letter);
    // En-tête 1 ; action 3 lignes + 1 vide ; INÈS 1 + 1 ; didascalie 1 ; réplique 2 ; action 3 + 1 ;
    // HUGO 1 + 1 ; réplique 1 ; INÈS 1 + 1 ; réplique 1 ; didascalie 1 ; réplique 1 ; transition 1 + 1 ;
    // en-tête 1 + 1 ; action 2 + 1.
    expect(result.lines).toEqual([1, 4, 2, 1, 2, 4, 2, 1, 2, 1, 1, 1, 2, 2, 3]);
    expect(result.lines.reduce((a, b) => a + b)).toBe(29);
    expect(result.pages).toBe(1);
    expect(new Set(result.startPage)).toEqual(new Set([1]));
    expect(pagesBetween(result, 0, 13)).toBeCloseTo(24 / 55);
  });

  it("fichier torture : notes, sections et texte mis de côté ne comptent pas, le saut de page si", () => {
    const { elements } = parse(torture);
    const result = paginate(elements, letter);
    elements.forEach((el, i) => {
      if (["note", "boneyard", "section", "synopsis", "pageBreak"].includes(el.type)) expect(result.lines[i], el.type).toBe(0);
      else expect(result.lines[i], el.text).toBeGreaterThan(0);
    });
    const breakAt = elements.findIndex((el) => el.type === "pageBreak");
    expect(result.startPage[breakAt - 1]).toBe(1);
    expect(result.startPage[breakAt + 2]).toBe(2);
    expect(result.pages).toBe(2);
  });

  it("long métrage : 150 fois la scène donne environ 80 pages", () => {
    const scene = parse(courtFr).elements;
    const long = Array.from({ length: 150 }, () => scene).flat();
    const result = paginate(long, letter);
    // 150 × 30 lignes (29 + la ligne vide entre deux scènes) ÷ 55, plus les fins de page laissées vides.
    expect(result.pages).toBeGreaterThanOrEqual(82);
    expect(result.pages).toBeLessThanOrEqual(86);
    // A4 : plus de lignes par page, donc moins de pages.
    expect(paginate(long, a4).pages).toBeLessThan(result.pages);
  });
});

describe("règles", () => {
  it("scénario vide : zéro page", () => {
    expect(paginate([], letter)).toMatchObject({ pages: 0, startPage: [], lines: [] });
    expect(paginate([{ type: "note", text: "rien" }, action("")], letter).pages).toBe(0);
  });

  it("pas de ligne vide en haut de page, ni dans un bloc de dialogue", () => {
    const result = paginate(
      [
        { type: "character", text: "HUGO" },
        { type: "parenthetical", text: "(bas)" },
        { type: "dialogue", text: "Oui." },
        action("Il sort."),
      ],
      letter,
    );
    expect(result.lines).toEqual([1, 1, 1, 2]);
  });

  it("une page pleine : l'élément suivant ouvre la page 2", () => {
    const result = paginate([block(55), action("Suite.")], letter);
    expect(result.startPage).toEqual([1, 2]);
    expect(result.lines).toEqual([55, 1]);
    expect(result.pages).toBe(2);
  });

  it("un long paragraphe se poursuit sur la page suivante", () => {
    const result = paginate([block(50), block(20), action("Fin.")], letter);
    // 50 + 1 + 20 = 71 lignes : le deuxième paragraphe commence page 1 et finit page 2.
    expect(result.startPage).toEqual([1, 1, 2]);
    expect(result.pages).toBe(2);
  });

  it("un en-tête de scène ne termine jamais une page", () => {
    const heading: ScreenplayElement = { type: "sceneHeading", text: "INT. PHARE - NUIT" };
    // Il reste 3 lignes : vide + en-tête + vide, plus de place pour le texte de la scène.
    expect(paginate([block(52), heading, action("Texte.")], letter).startPage).toEqual([1, 2, 2]);
    // Il en reste 4 : l'en-tête et une ligne de texte tiennent.
    expect(paginate([block(51), heading, action("Texte.")], letter).startPage).toEqual([1, 1, 1]);
  });

  it("un personnage n'est pas séparé de sa réplique", () => {
    const cue: ScreenplayElement[] = [
      { type: "character", text: "HUGO" },
      { type: "dialogue", text: "Oui." },
    ];
    expect(paginate([block(53), ...cue], letter).startPage).toEqual([1, 2, 2]);
    expect(paginate([block(52), ...cue], letter).startPage).toEqual([1, 1, 1]);
  });

  it("saut de page : seulement si la page est entamée", () => {
    const pageBreak: ScreenplayElement = { type: "pageBreak", text: "" };
    expect(paginate([pageBreak, action("Un."), pageBreak, pageBreak, action("Deux.")], letter).startPage).toEqual([1, 1, 2, 2, 2]);
  });

  it("A4 : l'action est plus étroite", () => {
    const text = "x".repeat(29) + " " + "y".repeat(29);
    expect(paginate([action(text)], letter).lines).toEqual([1]);
    expect(paginate([action(text)], a4).lines).toEqual([2]);
  });
});
