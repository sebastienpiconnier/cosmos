// @vitest-environment happy-dom
// Sélection multiple sur le canevas : tout sélectionner, déplacer ensemble, mettre à la corbeille d'un coup.

import { beforeEach, describe, expect, it } from "vitest";
import { useCosmos } from "../store";
import { useSettings } from "../settings";

const state = () => useCosmos.getState();

beforeEach(async () => {
  localStorage.clear();
  useSettings.setState({ lang: "fr" });
  useCosmos.setState({ loaded: false, screen: "home", projects: [], nodes: [], frames: [], edges: [], screenplay: null, savedScreenplay: null, paperChosen: false, lastFiles: {}, past: [], future: [], trash: [], trashNotice: null });
  await state().start();
  await state().createProject({ title: "Essai", kind: "roman" });
});

describe("sélection multiple", () => {
  it("tout sélectionner puis tout désélectionner : rien n'est « modifié », rien dans l'historique", async () => {
    state().addCard({ x: 0, y: 0 });
    state().addCard({ x: 600, y: 0 });
    state().addFrame({ x: 300, y: 600 });
    await state().save();
    const past = state().past.length;
    state().selectAll();
    expect(state().nodes.every((n) => n.selected)).toBe(true);
    expect(state().frames.every((f) => f.selected)).toBe(true);
    state().clearSelection();
    expect(state().nodes.some((n) => n.selected)).toBe(false);
    expect(state().frames.some((f) => f.selected)).toBe(false);
    expect(state().status).toBe("enregistre");
    expect(state().past.length).toBe(past);
  });

  it("plusieurs cartes à la corbeille en une étape, et une annulation les rend toutes", () => {
    const a = state().addCard({ x: 0, y: 0 });
    const b = state().addCard({ x: 600, y: 0 });
    const c = state().addCard({ x: 1200, y: 0 });
    state().linkCards(a, c, "connaît");
    state().deleteCards([a, b, "inconnue"]);
    expect(state().nodes.map((n) => n.id)).toEqual([c]);
    expect(state().edges).toEqual([]);
    expect(state().trashNotice).toMatchObject({ count: 2 });
    state().undo();
    expect(state().nodes.map((n) => n.id).sort()).toEqual([a, b, c].sort());
    expect(state().edges).toHaveLength(1);
  });

  it("déplacer deux cartes ensemble ne fait qu'une étape d'historique", () => {
    const a = state().addCard({ x: 0, y: 0 });
    const b = state().addCard({ x: 600, y: 0 });
    const past = state().past.length;
    state().onNodesChange([
      { type: "position", id: a, position: { x: 50, y: 50 }, dragging: true },
      { type: "position", id: b, position: { x: 650, y: 50 }, dragging: true },
    ]);
    state().onNodesChange([
      { type: "position", id: a, position: { x: 100, y: 100 }, dragging: true },
      { type: "position", id: b, position: { x: 700, y: 100 }, dragging: true },
    ]);
    expect(state().past.length).toBe(past + 1);
    state().undo();
    expect(state().nodes.find((n) => n.id === a)?.position).toEqual({ x: 0, y: 0 });
    expect(state().nodes.find((n) => n.id === b)?.position.x).toBe(600);
  });
});
