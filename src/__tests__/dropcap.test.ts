// Lettrine du manuscrit : jamais dans le paragraphe où l'on écrit (WebKit y perdait le curseur).

import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { dropCapAt } from "../components/dropCap";

const schema = getSchema([StarterKit]);
const doc = (...texts: string[]) => schema.node("doc", null, texts.map((t) => schema.node("paragraph", null, t ? schema.text(t) : undefined)));
const at = (d: ReturnType<typeof doc>, pos: number) => EditorState.create({ doc: d, selection: TextSelection.create(d, pos) });

describe("lettrine", () => {
  it("posée sur le premier paragraphe quand on écrit ailleurs ou que l'éditeur n'a pas le focus", () => {
    const d = doc("Le vent soufflait.", "Elle ouvrit le journal.");
    const inFirst = at(d, 3);
    expect(dropCapAt(inFirst, true)).toBeNull();
    expect(dropCapAt(inFirst, false)).toEqual({ from: 0, to: d.firstChild!.nodeSize });
    const inSecond = at(d, d.firstChild!.nodeSize + 2);
    expect(dropCapAt(inSecond, true)).toEqual({ from: 0, to: d.firstChild!.nodeSize });
  });

  it("jamais sur un premier paragraphe vide", () => {
    expect(dropCapAt(at(doc(""), 1), false)).toBeNull();
  });
});
