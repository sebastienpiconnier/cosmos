// Séquencier : découpage en blocs et déplacement d'une scène entière.

import { describe, expect, it } from "vitest";
import { parse } from "../parse";
import { serialize } from "../serialize";
import { blocks, moveBlock } from "../sequence";

const source = [
  "Title: Le Phare des Absents",
  "",
  "FONDU À L’OUVERTURE.",
  "",
  "# Acte I",
  "",
  "= L’arrivée.",
  "",
  "EXT. CHEMIN DES GALETS - AUBE [[cosmos:galets]]",
  "",
  "Inès rejoint l’îlot.",
  "",
  "INT. PHARE, CUISINE - JOUR",
  "",
  "Tout est propre.",
  "",
  "INÈS",
  "Trop propre.",
  "",
  "# Acte II",
  "",
  "EXT. PORT - JOUR [[cosmos:port]]",
  "",
  "Hugo ment sur la date.",
  "",
].join("\n");

const screenplay = parse(source);
const order = (elements = screenplay.elements) => blocks(elements).map((b) => (b.kind === "scene" ? `${b.number}. ${b.text}` : `# ${b.text}`));

describe("blocs", () => {
  it("scènes et sections dans l'ordre du fichier ; l'ouverture n'en fait pas partie", () => {
    expect(blocks(screenplay.elements)).toEqual([
      { kind: "section", start: 1, end: 3, text: "Acte I", depth: 1 },
      { kind: "scene", start: 3, end: 5, text: "EXT. CHEMIN DES GALETS - AUBE", cardId: "galets", number: 1 },
      { kind: "scene", start: 5, end: 9, text: "INT. PHARE, CUISINE - JOUR", cardId: undefined, number: 2 },
      { kind: "section", start: 9, end: 10, text: "Acte II", depth: 1 },
      { kind: "scene", start: 10, end: 12, text: "EXT. PORT - JOUR", cardId: "port", number: 3 },
    ]);
  });

  it("scénario sans scène", () => {
    expect(blocks(parse("Une action seule.\n").elements)).toEqual([]);
  });
});

describe("déplacer une scène", () => {
  it("intervertir deux scènes : chacune emporte tout son texte", () => {
    const moved = moveBlock(screenplay.elements, 2, 1);
    expect(order(moved)).toEqual([
      "# Acte I",
      "1. INT. PHARE, CUISINE - JOUR",
      "2. EXT. CHEMIN DES GALETS - AUBE",
      "# Acte II",
      "3. EXT. PORT - JOUR",
    ]);
    const fountain = serialize({ ...screenplay, elements: moved });
    expect(fountain).toContain("= L’arrivée.\n\nINT. PHARE, CUISINE - JOUR\n\nTout est propre.\n\nINÈS\nTrop propre.\n\nEXT. CHEMIN DES GALETS - AUBE [[cosmos:galets]]\n\nInès rejoint l’îlot.\n\n# Acte II");
  });

  it("sans perte : mêmes éléments, mêmes lignes, dans un autre ordre", () => {
    const moved = moveBlock(screenplay.elements, 4, 1);
    expect(moved).toHaveLength(screenplay.elements.length);
    expect(new Set(moved)).toEqual(new Set(screenplay.elements));
    const lines = (text: string) => text.split("\n").filter(Boolean).sort();
    expect(lines(serialize({ ...screenplay, elements: moved }))).toEqual(lines(source));
    // Et l'aller-retour ramène le fichier d'origine.
    expect(serialize({ ...screenplay, elements: moveBlock(moved, 1, 4) })).toBe(source);
  });

  it("franchir une section change la scène d'acte, la section ne bouge pas", () => {
    expect(order(moveBlock(screenplay.elements, 4, 3))).toEqual([
      "# Acte I",
      "1. EXT. CHEMIN DES GALETS - AUBE",
      "2. INT. PHARE, CUISINE - JOUR",
      "3. EXT. PORT - JOUR",
      "# Acte II",
    ]);
  });

  it("l'ouverture reste en tête", () => {
    const moved = moveBlock(screenplay.elements, 4, 0);
    expect(moved[0]).toEqual({ type: "action", text: "FONDU À L’OUVERTURE." });
    expect(order(moved)[0]).toBe("1. EXT. PORT - JOUR");
  });

  it("rien à déplacer : même tableau", () => {
    expect(moveBlock(screenplay.elements, 2, 2)).toBe(screenplay.elements);
    expect(moveBlock(screenplay.elements, 2, 9)).toBe(screenplay.elements);
    expect(moveBlock(screenplay.elements, -1, 0)).toBe(screenplay.elements);
  });
});
