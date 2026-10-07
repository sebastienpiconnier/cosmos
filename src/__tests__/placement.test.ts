// @vitest-environment happy-dom
// Les cartes ne se chevauchent pas à la création, d'où qu'elles viennent.

import { beforeEach, describe, expect, it } from "vitest";
import { CARD_SIZE, firstFreeCell, freeSpot, type Box } from "../placement";
import { useCosmos } from "../store";

const box = (x: number, y: number, height = CARD_SIZE.height): Box => ({ x, y, width: CARD_SIZE.width, height });
const touching = (a: { x: number; y: number }, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + CARD_SIZE.width && a.y < b.y + b.height && b.y < a.y + CARD_SIZE.height;

describe("emplacement libre le plus proche", () => {
  it("l'endroit demandé s'il est libre", () => {
    expect(freeSpot({ x: 500, y: 300 }, [])).toEqual({ x: 500, y: 300 });
    expect(freeSpot({ x: 500, y: 300 }, [box(0, 0)])).toEqual({ x: 500, y: 300 });
  });

  it("sinon juste à côté, sans toucher aucune carte", () => {
    const boxes = [box(100, 100), box(380, 100), box(100, 300)];
    const spot = freeSpot({ x: 110, y: 110 }, boxes);
    expect(boxes.some((b) => touching(spot, b))).toBe(false);
    // Tout près : moins de deux cartes d'écart.
    expect(Math.hypot(spot.x - 110, spot.y - 110)).toBeLessThan(2 * CARD_SIZE.width);
  });

  it("dix cartes demandées au même endroit : aucune ne se chevauche", () => {
    const boxes: Box[] = [];
    for (let i = 0; i < 10; i++) {
      const spot = freeSpot({ x: 400, y: 400 }, boxes);
      expect(boxes.some((b) => touching(spot, b)), `carte ${i}`).toBe(false);
      boxes.push(box(spot.x, spot.y));
    }
  });

  it("tient compte de la hauteur réelle d'une longue carte", () => {
    const tall = box(100, 100, 600);
    const spot = freeSpot({ x: 100, y: 400 }, [tall]);
    expect(touching(spot, tall)).toBe(false);
  });
});

describe("première case libre de la grille", () => {
  it("les cartes se rangent côte à côte, cinq par ligne", () => {
    const boxes: Box[] = [];
    const spots = [];
    for (let i = 0; i < 7; i++) {
      const spot = firstFreeCell(boxes);
      spots.push(spot);
      boxes.push(box(spot.x, spot.y));
    }
    expect(spots.slice(0, 5).map((s) => s.x)).toEqual([80, 360, 640, 920, 1200]);
    expect(spots.slice(0, 5).every((s) => s.y === 80)).toBe(true);
    expect(spots[5]).toEqual({ x: 80, y: 280 });
  });

  it("saute les cases occupées par des cartes posées librement", () => {
    expect(firstFreeCell([box(60, 60), box(300, 120)])).toEqual({ x: 640, y: 80 });
  });
});

describe("dans le store", () => {
  beforeEach(() => useCosmos.setState({ nodes: [], edges: [], screenplay: null, kind: "roman" }));
  const overlapping = () => {
    const nodes = useCosmos.getState().nodes;
    return nodes.some((a, i) => nodes.slice(i + 1).some((b) => touching(a.position, box(b.position.x, b.position.y))));
  };

  it("bouton « Nouvelle carte » ou touche N, plusieurs fois de suite au même endroit", () => {
    for (let i = 0; i < 6; i++) useCosmos.getState().addCard({ x: 300, y: 200 });
    expect(useCosmos.getState().nodes).toHaveLength(6);
    expect(overlapping()).toBe(false);
  });

  it("cartes créées depuis la Bible ou le scénario, mêlées aux autres", () => {
    const { addCard, addTitledCard } = useCosmos.getState();
    addCard({ x: 80, y: 80 });
    addCard({ x: 380, y: 100 });
    for (const title of ["Inès", "Hugo", "Le gardien", "Phare"]) addTitledCard("personnage", title);
    expect(useCosmos.getState().nodes).toHaveLength(6);
    expect(overlapping()).toBe(false);
  });
});
