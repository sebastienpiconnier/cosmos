// @vitest-environment happy-dom
// Corbeille : une carte supprimée attend dans corbeille/<id>.md, avec ses fils, et revient à sa place.

import { beforeEach, describe, expect, it } from "vitest";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { storage } from "../storage";
import { fileToCard, cardToFile } from "../storage/markdown";
import { readTrashInfo } from "../trash";

const state = () => useCosmos.getState();

beforeEach(async () => {
  localStorage.clear();
  useSettings.setState({ lang: "fr" });
  useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, paperChosen: false, lastFiles: {}, past: [], future: [], trash: [], trashNotice: null });
  await state().start();
  await state().createProject({ title: "Essai", kind: "roman" });
});

describe("corbeille", () => {
  it("supprimer met la carte à la corbeille, l'enregistre à part, la relit, et la remet avec ses fils", async () => {
    const a = state().addCard({ x: 0, y: 0 }, "personnage");
    state().updateCard(a, { title: "Inès" });
    const b = state().addCard({ x: 600, y: 0 }, "lieu");
    state().linkCards(a, b, "garde");
    state().deleteCard(a);
    expect(state().nodes.map((n) => n.id)).toEqual([b]);
    expect(state().edges).toEqual([]);
    expect(state().trashNotice).toMatchObject({ count: 1, title: "Inès" });
    await state().closeProject();
    const files = (await storage.readAll())!;
    expect(files[`cartes/${a}.md`]).toBeUndefined();
    expect(files[`corbeille/${a}.md`]).toMatch(/^corbeille: \{"date":"\d{4}-\d{2}-\d{2}"/m);

    await state().openProject(state().projects[0].id);
    expect(state().trash.map((c) => c.id)).toEqual([a]);
    state().restoreFromTrash(a);
    expect(state().nodes.find((n) => n.id === a)?.data.title).toBe("Inès");
    expect(state().edges).toMatchObject([{ source: a, target: b, label: "garde" }]);
    expect(state().trash).toEqual([]);
    await state().save();
    expect((await storage.readAll())![`corbeille/${a}.md`]).toBeUndefined();
  });

  it("Suppr au clavier passe aussi par la corbeille ; annuler et supprimer pour de bon", () => {
    const a = state().addCard({ x: 0, y: 0 });
    state().onNodesChange([{ type: "remove", id: a }]);
    expect(state().trash.map((c) => c.id)).toEqual([a]);
    state().undo();
    expect(state().trash).toEqual([]);
    expect(state().nodes.map((n) => n.id)).toEqual([a]);
    state().deleteCard(a);
    state().purgeTrash(a);
    expect(state().trash).toEqual([]);
    state().deleteCard(state().addCard({ x: 0, y: 0 }));
    state().purgeTrash();
    expect(state().trash).toEqual([]);
  });

  it("une ligne `corbeille:` mal formée est ignorée ; une carte vivante n'en a pas", () => {
    expect(readTrashInfo({ date: "hier" })).toBeUndefined();
    expect(readTrashInfo({ date: "2026-10-09", x: "a", links: [{ id: 1 }] })).toEqual({ date: "2026-10-09", x: 0, y: 0, links: [] });
    const card = { id: "k3x9a7bq2m", type: "idee" as const, title: "x", html: "" };
    expect(cardToFile(card)).not.toContain("corbeille");
    expect(fileToCard(cardToFile({ ...card, trashed: { date: "2026-10-09", x: 1, y: 2, links: [] } }))?.trashed).toEqual({ date: "2026-10-09", x: 1, y: 2, links: [] });
  });
});

describe("scénario : séquencier", () => {
  it("une scène sans carte part à la corbeille avec une carte, et revient reliée", async () => {
    await state().closeProject(true);
    await state().createProject({ title: "Film", kind: "scenario" });
    const sp = state().screenplay!;
    state().setScreenplay({ ...sp, elements: [...sp.elements, { type: "sceneHeading", text: "INT. PHARE - NUIT" }, { type: "action", text: "La lampe tourne." }] }, true);
    const start = state().screenplay!.elements.findIndex((e) => e.type === "sceneHeading");
    state().trashScreenplayScene(start);
    expect(state().screenplay!.elements.some((e) => e.type === "sceneHeading")).toBe(false);
    const [entry] = state().trash;
    expect(entry).toMatchObject({ type: "scene", title: "INT. PHARE - NUIT" });
    state().restoreFromTrash(entry.id);
    expect(state().screenplay!.elements.slice(-2)).toEqual([
      { type: "sceneHeading", text: "INT. PHARE - NUIT", cardId: entry.id },
      { type: "action", text: "La lampe tourne." },
    ]);
  });
});
