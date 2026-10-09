// Carte des relations et tableau d'ambiance de la Bible : relectures des fils et des images.

import { describe, expect, it } from "vitest";
import { edgePoint, relationMap } from "../relations";

const p = (id: string, title: string) => ({ id, type: "personnage" as const, title });

describe("carte des relations", () => {
  it("ne garde que les fils entre deux personnages, le plus relié au centre", () => {
    const cards = [p("a", "Inès"), p("b", "Yann"), p("c", "Maël"), p("d", "Rozenn"), { id: "l", type: "lieu" as const, title: "Phare" }];
    const links = [
      { id: "1", source: "a", target: "b", label: "sœur de" },
      { id: "2", source: "a", target: "c", label: "" },
      { id: "3", source: "a", target: "l", label: "y travaille" },
      { id: "4", source: "d", target: "d", label: "boucle" },
    ];
    const map = relationMap(cards, links);
    expect(map.edges.map((e) => e.id)).toEqual(["1", "2"]);
    expect(map.hub).toBe("a");
    const hub = map.nodes.find((n) => n.id === "a")!;
    expect([hub.x, hub.y]).toEqual([map.width / 2, map.height / 2]);
    expect(hub.degree).toBe(2);
    expect(map.nodes).toHaveLength(4);
    // Personne ne déborde du cadre.
    for (const n of map.nodes) {
      expect(n.x).toBeGreaterThan(40);
      expect(n.x).toBeLessThan(map.width - 40);
    }
  });

  it("pas de centre avec peu de personnages, carte vide sans personnage", () => {
    expect(relationMap([p("a", "A"), p("b", "B")], [{ id: "1", source: "a", target: "b", label: "" }]).hub).toBeNull();
    expect(relationMap([], [])).toMatchObject({ nodes: [], width: 0, hub: null });
    expect(relationMap([p("a", "A")], []).nodes).toHaveLength(1);
  });

  it("un fil part du bord du portrait", () => {
    expect(edgePoint(0, 0, 10, 0, 4)).toEqual({ x: 4, y: 0 });
  });
});
