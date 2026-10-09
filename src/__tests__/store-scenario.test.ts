// @vitest-environment happy-dom
// Test d'intégration : le store et le stockage navigateur (localStorage), avec scenario.fountain.

import { beforeEach, describe, expect, it } from "vitest";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { META_FILE, SCREENPLAY_FILE, cardPath, storage, type FileMap } from "../storage";
import { serialize } from "../screenplay/serialize";

const KEY = "cosmos:projet-demo";
const disk = (): FileMap => JSON.parse(localStorage.getItem(KEY) ?? "{}");
const state = () => useCosmos.getState();
const card = (id: string) => state().nodes.find((n) => n.id === id)!.data;

const cardFile = (id: string, type: string, title: string, body = "") =>
  `---\nid: ${id}\ntype: ${type}\ntitle: ${JSON.stringify(title)}\n---\n${body}\n`;

/** Projet scénario déjà sur « disque », avec un fichier Fountain écrit comme le ferait un autre logiciel. */
const foreignFountain = [
  "Title: Le Phare des Absents",
  "",
  "",
  "INT. PHARE, LANTERNE - NUIT [[cosmos:lanterne]]",
  "",
  "La lampe est froide.",
  "",
  "",
  ">FIN<",
  "",
].join("\n");

function putProject(files: FileMap) {
  localStorage.setItem(KEY, JSON.stringify(files));
}

function scenarioProject(fountain: string | null): FileMap {
  const files: FileMap = {
    [META_FILE]: JSON.stringify({
      version: 1,
      title: "Le Phare des Absents",
      kind: "scenario",
      layout: [
        { id: "ines", x: 0, y: 0 },
        { id: "port", x: 0, y: 400 },
        { id: "lanterne", x: 0, y: 100 },
      ],
      links: [],
    }),
    [cardPath("ines")]: cardFile("ines", "personnage", "Inès Morvan", "Gardienne **remplaçante**."),
    [cardPath("lanterne")]: cardFile("lanterne", "scene", "Vieux titre"),
    [cardPath("port")]: cardFile("port", "scene", "EXT. PORT - JOUR"),
  };
  if (fountain !== null) files[SCREENPLAY_FILE] = fountain;
  return files;
}

beforeEach(() => {
  localStorage.clear();
  useCosmos.setState({ loaded: false, lastFiles: {}, screenplay: null, savedScreenplay: null, nodes: [], edges: [], paperChosen: false });
});

describe("projet roman", () => {
  it("le stockage de test est bien celui du navigateur", () => {
    expect(storage.kind).toBe("browser");
  });

  it("scenario.fountain n'est jamais créé", async () => {
    await state().load();
    await state().save();
    expect(state().kind).toBe("roman");
    expect(Object.keys(disk())).toContain(META_FILE);
    expect(disk()).not.toHaveProperty(SCREENPLAY_FILE);
  });

  it("passer en scénario crée le fichier : page de titre et un en-tête par carte Scène", async () => {
    await state().load();
    await state().save();
    const scene = state().nodes.find((n) => n.data.type === "scene")!;

    state().setKind("scenario");
    expect(state().status).toBe("modifie");
    await state().save();

    expect(disk()[SCREENPLAY_FILE]).toBe(
      `Title: ${state().title}\n\n.${scene.data.title} [[cosmos:${scene.id}]]\n`,
    );
  });

  it("format de page : rien d'écrit pour un roman, le choix est enregistré et relu", async () => {
    await state().load();
    await state().save();
    expect(JSON.parse(disk()[META_FILE])).not.toHaveProperty("paper");

    state().setPaper("a4");
    expect(state().status).toBe("modifie");
    await state().save();
    expect(JSON.parse(disk()[META_FILE]).paper).toBe("a4");

    useCosmos.setState({ paper: "letter", paperChosen: false });
    await state().load();
    expect(state().paper).toBe("a4");
  });

  it("passer en scénario fixe le format : A4 en français, US Letter en anglais", async () => {
    for (const [lang, paper] of [["fr", "a4"], ["en", "letter"]] as const) {
      localStorage.clear();
      useSettings.setState({ lang });
      await state().load();
      state().setKind("scenario");
      await state().save();
      expect(JSON.parse(disk()[META_FILE]).paper, lang).toBe(paper);

      // Le format ne suit plus la langue ensuite : même pagination sur tous les appareils.
      useSettings.setState({ lang: lang === "fr" ? "en" : "fr" });
      await state().load();
      expect(state().paper, lang).toBe(paper);
    }
    useSettings.setState({ lang: "en" });
  });

  it("scénario existant sans format : fixé à l'ouverture, puis enregistré", async () => {
    useSettings.setState({ lang: "fr" });
    putProject(scenarioProject("INT. PHARE - NUIT [[cosmos:lanterne]]\n"));
    await state().load();
    expect(state().paper).toBe("a4");
    expect(state().status).toBe("modifie");
    await state().save();
    expect(JSON.parse(disk()[META_FILE]).paper).toBe("a4");
    useSettings.setState({ lang: "en" });
  });

  it("revenir en roman garde le fichier", async () => {
    await state().load();
    state().setKind("scenario");
    await state().save();
    const fountain = disk()[SCREENPLAY_FILE];

    state().setKind("roman");
    await state().save();
    expect(disk()[SCREENPLAY_FILE]).toBe(fountain);
    expect(JSON.parse(disk()[META_FILE]).kind).toBe("roman");
  });
});

describe("écrire, relire, comparer", () => {
  it("un projet scénario relu est identique, et rien n'est réécrit", async () => {
    putProject(scenarioProject(foreignFountain));
    await state().load();
    state().updateCard("lanterne", { title: "INT. PHARE, LANTERNE - AUBE" });
    await state().save();
    const written = disk();
    const before = { nodes: state().nodes.map((n) => n.data), screenplay: state().screenplay };

    useCosmos.setState({ nodes: [], screenplay: null });
    await state().load();
    expect(state().status).toBe("enregistre");
    expect({ nodes: state().nodes.map((n) => n.data), screenplay: state().screenplay }).toEqual(before);

    await state().save();
    expect(disk()).toEqual(written);
  });

  it("un fichier Fountain que l'auteur n'a pas touché n'est pas réécrit", async () => {
    putProject(scenarioProject(foreignFountain));
    await state().load();
    // « Vieux titre » a suivi l'en-tête : c'est la carte qui change, pas le scénario.
    expect(state().status).toBe("modifie");
    state().updateCard("ines", { html: "<p>Autre chose.</p>" });
    await state().save();

    expect(disk()[SCREENPLAY_FILE]).toBe(foreignFountain);
    expect(disk()[cardPath("ines")]).toContain("Autre chose.");
  });

  it("projet scénario sans fichier : il est préparé à l'ouverture, cartes de haut en bas", async () => {
    putProject(scenarioProject(null));
    await state().load();
    expect(state().status).toBe("modifie");
    await state().save();
    expect(disk()[SCREENPLAY_FILE]).toBe(
      "Title: Le Phare des Absents\n\n.Vieux titre [[cosmos:lanterne]]\n\nEXT. PORT - JOUR [[cosmos:port]]\n",
    );
  });
});

describe("lien scène ↔ carte", () => {
  beforeEach(async () => {
    putProject(scenarioProject(foreignFountain));
    await state().load();
  });

  it("au chargement, l'en-tête fait foi", () => {
    expect(card("lanterne").title).toBe("INT. PHARE, LANTERNE - NUIT");
    expect(card("port").title).toBe("EXT. PORT - JOUR");
  });

  it("renommer la carte renomme l'en-tête", async () => {
    state().updateCard("lanterne", { title: "INT. PHARE, LANTERNE - AUBE" });
    await state().save();
    expect(disk()[SCREENPLAY_FILE]).toContain("INT. PHARE, LANTERNE - AUBE [[cosmos:lanterne]]");
    expect(disk()[cardPath("lanterne")]).toContain('title: "INT. PHARE, LANTERNE - AUBE"');
  });

  it("vider le titre de la carte ne supprime pas l'en-tête", async () => {
    state().updateCard("lanterne", { title: "" });
    await state().save();
    expect(disk()[SCREENPLAY_FILE]).toBe(foreignFountain);
  });

  it("modifier l'en-tête dans le scénario renomme la carte", () => {
    const sp = state().screenplay!;
    const elements = sp.elements.map((el) =>
      el.cardId === "lanterne" ? { ...el, text: "INT. PHARE, ESCALIER - NUIT" } : el,
    );
    state().setScreenplay({ ...sp, elements });
    expect(card("lanterne").title).toBe("INT. PHARE, ESCALIER - NUIT");
    expect(state().status).toBe("modifie");
  });

  it("supprimer une carte Scène met la scène et son texte à la corbeille, d'où elle revient", async () => {
    state().deleteCard("lanterne");
    await state().save();

    let fountain = disk()[SCREENPLAY_FILE];
    expect(fountain).not.toContain("LANTERNE");
    expect(fountain).toBe(serialize(state().screenplay!));
    expect(disk()).not.toHaveProperty(cardPath("lanterne"));
    expect(disk()["corbeille/lanterne.md"]).toContain("La lampe est froide.");

    state().restoreFromTrash("lanterne");
    await state().save();
    fountain = disk()[SCREENPLAY_FILE];
    expect(fountain).toContain("INT. PHARE, LANTERNE - NUIT [[cosmos:lanterne]]\n\nLa lampe est froide.");
    expect(disk()).toHaveProperty(cardPath("lanterne"));
    expect(disk()).not.toHaveProperty("corbeille/lanterne.md");
  });

  it("carte créée depuis le scénario : sur une place libre, sans focus, reliée une seule fois", async () => {
    const id = state().addTitledCard("lieu", "Phare, Lanterne");
    const created = state().nodes.find((n) => n.id === id)!;
    expect(created.data).toMatchObject({ type: "lieu", title: "Phare, Lanterne" });
    // Les trois cartes du projet sont en x = 0 : la nouvelle ne se pose sur aucune d'elles.
    const others = state().nodes.filter((n) => n.id !== id);
    expect(others.every((n) => Math.abs(n.position.x - created.position.x) >= 240 || Math.abs(n.position.y - created.position.y) >= 150)).toBe(true);
    expect(state().pendingFocusId).toBeNull();

    state().linkCards("lanterne", id, "se passe à");
    state().linkCards(id, "lanterne", "autre");
    state().linkCards(id, id, "boucle");
    await state().save();
    expect(JSON.parse(disk()[META_FILE]).links).toEqual([
      { id: expect.any(String), source: "lanterne", target: id, label: "se passe à" },
    ]);
  });

  it("une carte qui n'est plus une Scène perd son lien", async () => {
    state().updateCard("lanterne", { type: "idee" });
    await state().save();
    expect(disk()[SCREENPLAY_FILE]).toContain("INT. PHARE, LANTERNE - NUIT\n");
    expect(disk()[SCREENPLAY_FILE]).not.toContain("[[cosmos:lanterne]]");
  });
});
