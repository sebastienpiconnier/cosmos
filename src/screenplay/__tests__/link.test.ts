// Lien entre les en-têtes de scène et les cartes Scène.

import { describe, expect, it } from "vitest";
import {
  cardsWithoutScene,
  headingTitles,
  initialScreenplay,
  renameHeading,
  scenesWithoutCard,
  unlinkCard,
} from "../link";
import { parse } from "../parse";
import { serialize } from "../serialize";

const source = [
  "INT. PHARE, LANTERNE - NUIT [[cosmos:lanterne]]",
  "",
  "La lampe est froide.",
  "",
  "EXT. PORT - JOUR",
  "",
  "Hugo ment sur la date.",
  "",
  "INT. MAIRIE - JOUR [[cosmos:mairie]]",
  "",
  "INT. PHARE, LANTERNE - AUBE [[cosmos:lanterne]]",
  "",
].join("\n");

describe("lecture des liens", () => {
  it("texte de l'en-tête par carte, le premier en-tête compte", () => {
    expect([...headingTitles(parse(source))]).toEqual([
      ["lanterne", "INT. PHARE, LANTERNE - NUIT"],
      ["mairie", "INT. MAIRIE - JOUR"],
    ]);
  });

  it("scènes sans carte : sans note, ou carte disparue", () => {
    expect(scenesWithoutCard(parse(source), ["lanterne"])).toEqual([
      { index: 2, text: "EXT. PORT - JOUR" },
      { index: 4, text: "INT. MAIRIE - JOUR" },
    ]);
  });

  it("cartes sans scène", () => {
    const cards = [
      { id: "lanterne", title: "INT. PHARE, LANTERNE - NUIT" },
      { id: "ponton", title: "EXT. PONTON - NUIT" },
    ];
    expect(cardsWithoutScene(parse(source), cards)).toEqual([cards[1]]);
  });
});

describe("renommer", () => {
  it("le titre de la carte passe dans son en-tête", () => {
    const sp = renameHeading(parse(source), "mairie", "  INT. MAIRIE, ARCHIVES - JOUR ");
    expect(serialize(sp)).toContain("INT. MAIRIE, ARCHIVES - JOUR [[cosmos:mairie]]");
  });

  it("rien ne change : même objet rendu", () => {
    const sp = parse(source);
    expect(renameHeading(sp, "mairie", "INT. MAIRIE - JOUR")).toBe(sp);
    expect(renameHeading(sp, "inconnue", "INT. X - JOUR")).toBe(sp);
  });

  it("un titre vide ne supprime pas l'en-tête", () => {
    const sp = parse(source);
    expect(renameHeading(sp, "mairie", "  ")).toBe(sp);
  });

  it("un titre libre reçoit un point de forçage à l'écriture", () => {
    const sp = renameHeading(parse(source), "mairie", "Le registre de la mairie");
    expect(serialize(sp)).toContain("\n.Le registre de la mairie [[cosmos:mairie]]\n");
  });
});

describe("délier", () => {
  it("retire la note, garde le texte de la scène", () => {
    const sp = unlinkCard(parse(source), "lanterne");
    expect(serialize(sp)).toBe(source.replaceAll(" [[cosmos:lanterne]]", ""));
    expect(headingTitles(sp).has("lanterne")).toBe(false);
  });

  it("carte non liée : même objet rendu", () => {
    const sp = parse(source);
    expect(unlinkCard(sp, "ponton")).toBe(sp);
  });
});

describe("premier scénario d'un projet", () => {
  it("page de titre et un en-tête par carte titrée, dans l'ordre reçu", () => {
    const sp = initialScreenplay(" Le Phare des Absents ", [
      { id: "a", title: "Inès trouve le journal de bord" },
      { id: "b", title: "" },
      { id: "c", title: "INT. PHARE, LANTERNE - NUIT" },
    ]);
    expect(serialize(sp)).toBe(
      [
        "Title: Le Phare des Absents",
        "",
        ".Inès trouve le journal de bord [[cosmos:a]]",
        "",
        "INT. PHARE, LANTERNE - NUIT [[cosmos:c]]",
        "",
      ].join("\n"),
    );
    expect(parse(serialize(sp)).elements.map((el) => el.cardId)).toEqual(["a", "c"]);
  });

  it("projet sans titre ni scène : scénario vide", () => {
    expect(initialScreenplay("", [])).toEqual({ titlePage: {}, elements: [] });
  });
});
