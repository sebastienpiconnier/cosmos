// Parseur et sérialiseur Fountain : classification attendue, aller-retour exact, forçages.

import { describe, expect, it } from "vitest";
import type { Screenplay, ScreenplayElement } from "../model";
import { parse } from "../parse";
import { serialize } from "../serialize";
import courtFr from "./fixtures/court-fr.fountain?raw";
import shortEn from "./fixtures/short-en.fountain?raw";
import torture from "./fixtures/torture.fountain?raw";

const lf = (text: string) => text.replace(/\r\n?/g, "\n");
const shape = (sp: Screenplay) => sp.elements.map((el) => `${el.type}: ${el.text}`);
const script = (...elements: ScreenplayElement[]): Screenplay => ({ titlePage: {}, elements });
const types = (source: string) => parse(source).elements.map((el) => el.type);

describe("classification", () => {
  it("scénario court en français", () => {
    const sp = parse(courtFr);
    expect(sp.titlePage).toEqual({
      Title: "Le Phare de Kerlaouen",
      Credit: "Écrit par",
      Author: "Inès Morvan",
      "Draft date": "7 octobre 2026",
    });
    expect(shape(sp)).toEqual([
      "sceneHeading: INT. PHARE, LANTERNE - NUIT",
      "action: La lampe est froide. Sur la console, un cahier relié de cuir, ouvert.",
      "character: INÈS",
      "parenthetical: (à voix basse)",
      "dialogue: C’est daté d’hier.",
      "action: Elle tourne la page. L’écriture s’arrête au milieu d’une phrase.\nDehors, la mer cogne contre l’îlot.",
      "character: HUGO (H.C.)",
      "dialogue: Inès ? Tu es là-haut ?",
      "character: INÈS",
      "dialogue: J’arrive.",
      "parenthetical: (un temps)",
      "dialogue: Ne monte pas.",
      "transition: COUPE À :",
      "sceneHeading: EXT. ÎLOT - AUBE",
      "action: La marée découvre le passage. Hugo attend, une lanterne éteinte à la main.",
    ]);
    expect(sp.elements[0].cardId).toBe("k3x9a7bq2m");
    expect(sp.elements[12].forced).toBe(true);
  });

  it("scénario court en anglais", () => {
    const sp = parse(shortEn);
    expect(sp.titlePage.Title).toBe("The Kerlaouen Light");
    expect(shape(sp)).toEqual([
      "sceneHeading: INT. LIGHTHOUSE, LANTERN ROOM - NIGHT",
      "action: The lamp is cold. On the console, a leather-bound logbook lies open.",
      "character: INÈS",
      "parenthetical: (under her breath)",
      "dialogue: That’s dated yesterday.",
      "action: She turns the page. The handwriting stops mid-sentence.",
      "character: HUGO (O.S.)",
      "dialogue: Inès? Are you up there?",
      "character: INÈS (CONT'D)",
      "dialogue: Don’t come up.",
      "transition: CUT TO:",
      "sceneHeading: EXT. ISLET - DAWN",
      "action: The tide uncovers the causeway. Hugo waits, an unlit lantern in his hand.",
      "character: HUGO (V.O.)",
      "dialogue: I should have gone up.",
    ]);
    // Transition détectée seule : pas de forçage.
    expect(sp.elements[10].forced).toBeUndefined();
  });

  it("fichier torture", () => {
    const sp = parse(torture);
    expect(sp.titlePage).toEqual({
      Title: "TORTURE\nou l’art d’éprouver un parseur",
      Credit: "écrit par",
      Author: "Zoé N’Guyen",
      Contact: "12 rue de l’Été\n29200 Brest",
    });
    expect(shape(sp)).toEqual([
      "section: Acte I",
      "synopsis: Où l’on vérifie que rien ne se perd.",
      "sceneHeading: INTÉRIEUR. CUISINE DE L’ÉCOLE - JOUR",
      "action: ZOÉ ENTRE.\nElle s’arrête... puis repart.",
      "note: Vérifier l’heure du lever de soleil.",
      "character: ZOÉ",
      "parenthetical: (essoufflée)",
      "dialogue: J’ai couru. « Ça » n’attend pas.\n~Et je chante un peu.",
      "character: LÉA",
      "dialogue: On t’écoute. [[trop sec ?]]",
      "character: ZOÉ",
      "dialogue: Trop tard !",
      "character: McAVOY",
      "dialogue: Un nom avec une minuscule.",
      "sceneHeading: INT./EXT. VOITURE - CRÉPUSCULE",
      "action: ...et le moteur cale.",
      "boneyard: \nScène coupée.\n\nAvec une ligne vide dedans.\n",
      "transition: FONDU AU NOIR.",
      "centered: FIN DE L’ACTE I",
      "pageBreak: ",
      "section: Séquence 2",
      "sceneHeading: EXT. QUAI - NUIT",
      "action: LE QUAI EST DÉSERT.",
      "transition: CUT TO:",
      "sceneHeading: I/E PÉNICHE - PLUS TARD",
      "action: ~Une chanson pour finir.",
    ]);

    const el = sp.elements;
    expect(el[0].depth).toBe(1);
    expect(el[20].depth).toBe(2);
    expect(el[2]).toMatchObject({ forced: true, cardId: "abc123_-XY", sceneNumber: "12A" });
    expect(el[3].forced).toBe(true);
    expect(el[10].dual).toBe(true);
    expect(el[12].forced).toBe(true);
    expect(el[14].sceneNumber).toBe("13");
    expect(el[17].forced).toBe(true);
  });
});

describe("aller-retour", () => {
  const fixtures = { "court-fr": courtFr, "short-en": shortEn, torture };

  for (const [name, source] of Object.entries(fixtures)) {
    it(`${name} : serialize(parse(texte)) === texte`, () => {
      expect(serialize(parse(source))).toBe(lf(source));
    });

    it(`${name} : mêmes éléments après un second passage`, () => {
      const once = parse(source);
      expect(parse(serialize(once))).toEqual(once);
    });
  }

  it("ignore les fins de ligne Windows, les anciennes fins de ligne Mac et le BOM", () => {
    const expected = parse(courtFr);
    expect(parse("﻿" + lf(courtFr).replace(/\n/g, "\r\n"))).toEqual(expected);
    expect(parse(lf(courtFr).replace(/\n/g, "\r"))).toEqual(expected);
  });

  it("normalise les lignes vides en trop", () => {
    expect(serialize(parse("\n\nINT. PHARE - NUIT\n\n\n\nLa lampe.\n\n\n"))).toBe("INT. PHARE - NUIT\n\nLa lampe.\n");
  });

  it("long métrage (environ 120 pages) : aller-retour rapide", () => {
    const body = lf(courtFr).split("\n").slice(5).join("\n");
    const long = Array.from({ length: 150 }, () => body).join("\n");
    const sp = parse(long);
    expect(sp.elements.length).toBeGreaterThan(2000);

    const start = performance.now();
    const out = serialize(parse(long));
    const elapsed = performance.now() - start;
    expect(out).toBe(long);
    // Objectif du plan : 16 ms. Marge large ici pour les machines de CI lentes.
    expect(elapsed).toBeLessThan(200);
  });

  it("scénario vide", () => {
    expect(parse("")).toEqual({ titlePage: {}, elements: [] });
    expect(serialize({ titlePage: {}, elements: [] })).toBe("");
  });
});

describe("parseur : règles de détection", () => {
  it("en-têtes : préfixes reconnus, sans tenir compte de la casse", () => {
    for (const h of ["INT. A", "EXT. A", "EST. A", "INT./EXT. A", "INT/EXT A", "I/E A", "int. maison - jour"]) {
      expect(types(`${h}\n\nAction.`), h).toEqual(["sceneHeading", "action"]);
    }
  });

  it("un mot qui commence par INT n'est pas un en-tête", () => {
    expect(types("INTERDIT D’ENTRER\n\nAction.")).toEqual(["action", "action"]);
  });

  it("un en-tête doit être entouré de lignes vides", () => {
    expect(types("Il lit :\nINT. PHARE - NUIT")).toEqual(["action"]);
    expect(types("int. phare - nuit\nsuite")).toEqual(["action"]);
  });

  it("numéro de scène et lien, dans les deux ordres", () => {
    for (const source of ["INT. A - JOUR [[cosmos:x1]] #7#", "INT. A - JOUR #7# [[cosmos:x1]]"]) {
      expect(parse(source).elements[0]).toEqual({
        type: "sceneHeading",
        text: "INT. A - JOUR",
        cardId: "x1",
        sceneNumber: "7",
      });
    }
  });

  it("une autre note dans l'en-tête reste dans le texte", () => {
    expect(parse("INT. A - JOUR [[à revoir]]").elements[0]).toEqual({
      type: "sceneHeading",
      text: "INT. A - JOUR [[à revoir]]",
    });
  });

  it("un nom en majuscules suivi d'une ligne vide est de l'action", () => {
    expect(types("HUGO\n\nIl sort.")).toEqual(["action", "action"]);
  });

  it("un personnage a besoin d'une lettre", () => {
    expect(types("R2D2\nBip.")).toEqual(["character", "dialogue"]);
    expect(types("23\nBip.")).toEqual(["action"]);
  });

  it("extension en minuscules et dialogue double", () => {
    const el = parse("HUGO (cont’d) (V.O.)\nOui.\n\nINÈS ^\nNon.").elements;
    expect(el[0]).toEqual({ type: "character", text: "HUGO (cont’d) (V.O.)" });
    expect(el[2]).toEqual({ type: "character", text: "INÈS", dual: true });
    expect(parse("HUGO\nOui.\n\nINÈS^\nNon.").elements[2]).toEqual({ type: "character", text: "INÈS", dual: true });
  });

  it("réplique sur plusieurs paragraphes (ligne de deux espaces)", () => {
    const source = "HUGO\nPremier.\n  \nSecond.\n";
    const sp = parse(source);
    expect(shape(sp)).toEqual(["character: HUGO", "dialogue: Premier.\n\nSecond."]);
    expect(serialize(sp)).toBe(source);
  });

  it("transition : majuscules finissant par TO:, entre lignes vides", () => {
    expect(types("Action.\n\nSMASH CUT TO:\n\nINT. A")).toEqual(["action", "transition", "sceneHeading"]);
    expect(types("Cut to:\n\nAction.")).toEqual(["action", "action"]);
  });

  it("« FADE IN: » en tête de fichier n'est pas une page de titre", () => {
    const sp = parse("FADE IN:\n\nINT. A - JOUR");
    expect(sp.titlePage).toEqual({});
    expect(shape(sp)).toEqual(["action: FADE IN:", "sceneHeading: INT. A - JOUR"]);
  });

  it("un en-tête avec deux-points en tête de fichier n'est pas une page de titre", () => {
    const sp = parse("INT. PHARE: LANTERNE - NUIT\n\nAction.");
    expect(sp.titlePage).toEqual({});
    expect(types("INT. PHARE: LANTERNE - NUIT\n\nAction.")).toEqual(["sceneHeading", "action"]);
  });

  it("page de titre : valeur suivie de lignes indentées, tabulation", () => {
    expect(parse("Title: UN\n\tDEUX\nAuthor: X\n\nAction.").titlePage).toEqual({ Title: "UN\nDEUX", Author: "X" });
  });

  it("page de titre seule, sans corps", () => {
    const sp = parse("Title: Seul\n");
    expect(sp).toEqual({ titlePage: { Title: "Seul" }, elements: [] });
    expect(serialize(sp)).toBe("Title: Seul\n");
  });

  it("section et synopsis collés, saut de page long", () => {
    expect(shape(parse("#Acte I\n=Résumé\n====\nAction."))).toEqual([
      "section: Acte I",
      "synopsis: Résumé",
      "pageBreak: ",
      "action: Action.",
    ]);
  });

  it("un élément de structure coupe un paragraphe d'action", () => {
    expect(types("Action.\n# Acte II\nSuite.")).toEqual(["action", "section", "action"]);
  });

  it("boneyard sur une ligne, note sur plusieurs lignes", () => {
    expect(shape(parse("/* coupé */\n\n[[une note\nsur deux lignes]]"))).toEqual([
      "boneyard:  coupé ",
      "note: une note\nsur deux lignes",
    ]);
  });

  it("boneyard ou note jamais refermés : le texte reste de l'action", () => {
    expect(types("/* jamais fermé\n\nAction.")).toEqual(["action", "action"]);
    expect(types("[[jamais fermée\n\nAction.")).toEqual(["action", "action"]);
    expect(types("[[une]] et [[deux]]")).toEqual(["action"]);
  });

  it("l'indentation de l'action est conservée", () => {
    const source = "    Texte indenté.\n\tDeuxième ligne.\n";
    expect(parse(source).elements[0].text).toBe("    Texte indenté.\n\tDeuxième ligne.");
    expect(serialize(parse(source))).toBe(source);
  });
});

describe("sérialiseur : forçages", () => {
  it("en-tête français non standard : reçoit un point", () => {
    const out = serialize(script({ type: "sceneHeading", text: "INTÉRIEUR. PHARE - NUIT", cardId: "k1" }));
    expect(out).toBe(".INTÉRIEUR. PHARE - NUIT [[cosmos:k1]]\n");
    expect(parse(out).elements[0]).toEqual({
      type: "sceneHeading",
      text: "INTÉRIEUR. PHARE - NUIT",
      cardId: "k1",
      forced: true,
    });
  });

  it("en-tête standard : pas de point, numéro en dernier", () => {
    expect(serialize(script({ type: "sceneHeading", text: "INT. PHARE - NUIT", cardId: "k1", sceneNumber: "3" }))).toBe(
      "INT. PHARE - NUIT [[cosmos:k1]] #3#\n",
    );
  });

  it("personnage sans réplique : reçoit @", () => {
    const sp = script({ type: "character", text: "HUGO" }, { type: "action", text: "Il sort." });
    expect(serialize(sp)).toBe("@HUGO\n\nIl sort.\n");
    expect(types(serialize(sp))).toEqual(["character", "action"]);
    expect(serialize(script({ type: "character", text: "HUGO" }))).toBe("@HUGO\n");
  });

  it("personnage avec minuscules : reçoit @ ; dialogue double", () => {
    expect(
      serialize(
        script(
          { type: "character", text: "McAvoy", dual: true },
          { type: "parenthetical", text: "(bas)" },
          { type: "dialogue", text: "Oui." },
        ),
      ),
    ).toBe("@McAvoy ^\n(bas)\nOui.\n");
  });

  it("transition française : reçoit >", () => {
    expect(serialize(script({ type: "transition", text: "COUPE À :" }))).toBe("> COUPE À :\n");
    expect(serialize(script({ type: "transition", text: "CUT TO:" }))).toBe("CUT TO:\n");
  });

  it("action qui ressemble à autre chose : reçoit !", () => {
    const tricky = [
      "INT. PHARE - NUIT",
      "CUT TO:",
      "HUGO\nn’est pas un personnage ici.",
      "# pas une section",
      "= pas un synopsis",
      "> pas une transition",
      ".pas un en-tête",
      "@pas un personnage",
      "!déjà un point d’exclamation",
      "[[pas une note]]",
      "/* pas un boneyard */",
      "===",
    ];
    for (const text of tricky) {
      const sp = script({ type: "action", text });
      const out = serialize(sp);
      expect(out, text).toBe(`!${text}\n`);
      expect(parse(out).elements, text).toEqual([{ type: "action", text, forced: true }]);
    }
  });

  it("action ordinaire : pas de !", () => {
    for (const text of ["HUGO SORT.", "...puis rien.", "Est-ce bien lui ?", "~Une chanson."]) {
      expect(serialize(script({ type: "action", text })), text).toBe(`${text}\n`);
    }
  });

  it("les éléments vides ne s'écrivent pas, le saut de page si", () => {
    const sp = script(
      { type: "action", text: "Avant." },
      { type: "action", text: "" },
      { type: "pageBreak", text: "" },
      { type: "character", text: "" },
      { type: "action", text: "Après." },
    );
    expect(serialize(sp)).toBe("Avant.\n\n===\n\nAprès.\n");
  });

  it("éléments conservés : section sans niveau, synopsis, centré, note, boneyard", () => {
    const sp = script(
      { type: "section", text: "Acte I" },
      { type: "section", text: "Séquence", depth: 3 },
      { type: "synopsis", text: "Résumé" },
      { type: "centered", text: "FIN" },
      { type: "note", text: "à revoir" },
      { type: "boneyard", text: " coupé " },
    );
    expect(serialize(sp)).toBe("# Acte I\n\n### Séquence\n\n= Résumé\n\n> FIN <\n\n[[à revoir]]\n\n/* coupé */\n");
  });

  it("page de titre : valeurs vides ignorées, valeurs longues indentées", () => {
    expect(
      serialize({
        titlePage: { Title: "Le Phare", Credit: "", Contact: "1 rue du Port\nBrest" },
        elements: [{ type: "action", text: "Action." }],
      }),
    ).toBe("Title: Le Phare\nContact:\n    1 rue du Port\n    Brest\n\nAction.\n");
  });
});
