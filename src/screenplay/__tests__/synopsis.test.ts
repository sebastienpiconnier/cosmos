// @vitest-environment happy-dom
// Synopsis d'une scène (ligne « = … » sous son en-tête) et présentation du séquencier.

import { afterEach, describe, expect, it } from "vitest";
import { parse } from "../parse";
import { serialize } from "../serialize";
import { sceneSynopsis, setSceneSynopsis } from "../scenes";
import { blocks, moveBlock } from "../sequence";
import { paginate } from "../paginate";
import { LAYOUTS } from "../layout";
import { useSettings } from "../../settings";

const source = [
  "INT. PHARE - NUIT [[cosmos:a]]",
  "",
  "= Elle trouve le journal.",
  "",
  "= Le doute s’installe.",
  "",
  "La lampe est froide.",
  "",
  "EXT. PORT - JOUR",
  "",
  "Hugo attend.",
  "",
].join("\n");
const { elements } = parse(source);
const text = (list = elements) => serialize({ titlePage: {}, elements: list });

describe("lire le synopsis", () => {
  it("les lignes « = » placées juste sous l'en-tête, réunies", () => {
    expect(sceneSynopsis(elements, 0)).toBe("Elle trouve le journal. Le doute s’installe.");
    expect(sceneSynopsis(elements, 4)).toBe("");
  });

  it("un synopsis plus loin dans la scène n'est pas celui de l'en-tête", () => {
    const later = parse("INT. A - JOUR\n\nAction.\n\n= Note de structure.\n").elements;
    expect(sceneSynopsis(later, 0)).toBe("");
  });
});

describe("écrire le synopsis", () => {
  it("ajouter : une ligne Fountain sous l'en-tête, le reste de la scène intact", () => {
    const next = setSceneSynopsis(elements, 4, "  Hugo ment\nsur la date. ");
    expect(text(next)).toContain("EXT. PORT - JOUR\n\n= Hugo ment sur la date.\n\nHugo attend.\n");
    expect(sceneSynopsis(next, 4)).toBe("Hugo ment sur la date.");
  });

  it("remplacer : les anciennes lignes font place à une seule", () => {
    const next = setSceneSynopsis(elements, 0, "Elle lit le journal de bord.");
    expect(text(next)).toBe(source.replace("= Elle trouve le journal.\n\n= Le doute s’installe.", "= Elle lit le journal de bord."));
  });

  it("vider : le synopsis disparaît, pas le texte", () => {
    const next = setSceneSynopsis(elements, 0, "   ");
    expect(text(next)).toBe(source.replace("= Elle trouve le journal.\n\n= Le doute s’installe.\n\n", ""));
  });

  it("rien ne change : même tableau ; pas un en-tête : rien", () => {
    expect(setSceneSynopsis(elements, 0, "Elle trouve le journal. Le doute s’installe.")).toBe(elements);
    expect(setSceneSynopsis(elements, 3, "Sur une action")).toBe(elements);
    expect(setSceneSynopsis(elements, 99, "Hors du texte")).toBe(elements);
  });

  it("le fichier relu redonne le même synopsis, et il ne compte pas dans les pages", () => {
    const next = setSceneSynopsis(elements, 4, "Hugo ment sur la date.");
    const again = parse(text(next)).elements;
    expect(sceneSynopsis(again, again.findIndex((el) => el.text === "EXT. PORT - JOUR"))).toBe("Hugo ment sur la date.");
    expect(paginate(next, LAYOUTS.letter).lines.reduce((a, b) => a + b)).toBe(paginate(elements, LAYOUTS.letter).lines.reduce((a, b) => a + b));
  });

  it("le synopsis suit sa scène quand on la déplace dans le séquencier", () => {
    const moved = moveBlock(elements, 1, 0);
    const scene = blocks(moved).find((b) => b.text === "INT. PHARE - NUIT")!;
    expect(sceneSynopsis(moved, scene.start)).toBe("Elle trouve le journal. Le doute s’installe.");
  });
});

describe("présentation du séquencier", () => {
  afterEach(() => useSettings.setState({ sequencerMode: "outline" }));

  it("en liste par défaut ; le choix est un réglage de l'appareil", () => {
    expect(useSettings.getState().sequencerMode).toBe("outline");
    useSettings.getState().setSequencerMode("cards");
    expect(useSettings.getState().sequencerMode).toBe("cards");
  });
});
