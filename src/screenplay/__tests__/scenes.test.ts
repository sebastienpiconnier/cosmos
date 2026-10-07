// Lecture du scénario par scènes : liste, personnages, décors.

import { describe, expect, it } from "vitest";
import { parse } from "../parse";
import { characterName, headingParts, listScenes, sceneAt, sceneCharacters, scenesInLocation } from "../scenes";
import courtFr from "./fixtures/court-fr.fountain?raw";

const { elements } = parse(courtFr);
const scenes = listScenes(elements);

describe("liste des scènes", () => {
  it("une scène par en-tête, avec ses bornes", () => {
    expect(scenes).toEqual([
      { number: 1, index: 0, end: 13, text: "INT. PHARE, LANTERNE - NUIT", cardId: "k3x9a7bq2m" },
      { number: 2, index: 13, end: 15, text: "EXT. ÎLOT - AUBE", cardId: undefined },
    ]);
  });

  it("scène qui contient un élément", () => {
    expect(sceneAt(scenes, 0)?.number).toBe(1);
    expect(sceneAt(scenes, 12)?.number).toBe(1);
    expect(sceneAt(scenes, 14)?.number).toBe(2);
    expect(sceneAt(listScenes(parse("Avant tout.\n\nINT. A - JOUR\n").elements), 0)).toBeNull();
  });
});

describe("personnages", () => {
  it("nom sans extension ni marque de dialogue double", () => {
    expect(characterName("HUGO (H.C.)")).toBe("HUGO");
    expect(characterName("INÈS (V.O.) (CONT'D) ^")).toBe("INÈS");
    expect(characterName("  LE GARDIEN ")).toBe("LE GARDIEN");
  });

  it("ceux qui parlent dans la scène, par ordre d'entrée", () => {
    expect(sceneCharacters(elements, scenes[0])).toEqual([
      { name: "INÈS", lines: 2 },
      { name: "HUGO", lines: 1 },
    ]);
    expect(sceneCharacters(elements, scenes[1])).toEqual([]);
  });
});

describe("décors", () => {
  it("préfixe, décor, moment", () => {
    expect(headingParts("INT. PHARE, LANTERNE - NUIT")).toEqual({ prefix: "INT.", location: "PHARE, LANTERNE", time: "NUIT" });
    expect(headingParts("int./ext. voiture - crépuscule")).toEqual({ prefix: "int./ext.", location: "voiture", time: "crépuscule" });
    expect(headingParts("EXT. PORT")).toEqual({ prefix: "EXT.", location: "PORT", time: "" });
    expect(headingParts("I/E PÉNICHE - PLUS TARD")).toEqual({ prefix: "I/E", location: "PÉNICHE", time: "PLUS TARD" });
  });

  it("un en-tête libre est tout entier un décor", () => {
    expect(headingParts("Inès trouve le journal de bord")).toEqual({ prefix: "", location: "Inès trouve le journal de bord", time: "" });
    expect(headingParts("INTÉRIEUR. CUISINE - JOUR").location).toBe("INTÉRIEUR. CUISINE");
  });

  it("scènes dans le même décor, sans tenir compte de la casse", () => {
    const list = listScenes(parse("INT. PHARE - NUIT\n\nEXT. PORT - JOUR\n\nint. phare - aube\n").elements);
    expect(scenesInLocation(list, "PHARE", "fr")).toBe(2);
    expect(scenesInLocation(list, "MAIRIE", "fr")).toBe(0);
    expect(scenesInLocation(list, "", "fr")).toBe(0);
  });
});
