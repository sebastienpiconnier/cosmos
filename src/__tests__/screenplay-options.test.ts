// Options d'un scénario : en-têtes soulignés (éditeur, PDF, Final Draft), enregistrés dans cosmos.json.

import { describe, expect, it } from "vitest";
import { typeset } from "../screenplay/export/typeset";
import { buildFdx } from "../screenplay/export/fdx";
import { LAYOUTS } from "../screenplay/layout";
import { KNOWN_META } from "../projectState";
import { isBeat } from "../plan";
import type { ScreenplayElement } from "../screenplay/model";

const elements: ScreenplayElement[] = [
  { type: "sceneHeading", text: "INT. PHARE - NUIT" },
  { type: "action", text: "La lampe tourne." },
];
const strings = { more: "(À SUIVRE)", contd: "(SUITE)" };

describe("en-têtes soulignés", () => {
  it("le PDF souligne l'en-tête seulement si on le demande", () => {
    const plain = typeset(elements, LAYOUTS.a4, "fr", strings)[0].lines;
    expect(plain.some((l) => l.underline)).toBe(false);
    const lines = typeset(elements, LAYOUTS.a4, "fr", strings, { underlineHeadings: true, numberScenes: true })[0].lines;
    expect(lines.filter((l) => l.underline).map((l) => l.text)).toEqual(["INT. PHARE - NUIT"]);
    // Les numéros dans les marges ne sont pas soulignés.
    expect(lines.filter((l) => l.text === "1").every((l) => !l.underline)).toBe(true);
  });

  it("Final Draft reçoit le style Underline sur l'en-tête", () => {
    const fdx = buildFdx({ titlePage: {}, elements }, "fr", false, true);
    expect(fdx).toContain('<Text Style="Underline">INT. PHARE - NUIT</Text>');
    expect(fdx).toContain("<Text>La lampe tourne.</Text>");
    expect(buildFdx({ titlePage: {}, elements }, "fr")).not.toContain("Underline");
  });

  it("l'option est une clé connue de cosmos.json, les cases de gabarit sont reconnues", () => {
    expect(KNOWN_META.has("underlineHeadings")).toBe(true);
    expect(isBeat("e_teaser")).toBe(true);
    expect(isBeat("inconnue")).toBe(false);
  });
});
