// Lettrine du manuscrit, posée par une décoration plutôt que par le seul CSS : le premier paragraphe ne la
// reçoit (classe `has-dropcap`) que quand on n'y écrit pas. Un `::first-letter` flottant dans un texte
// modifiable dérègle le curseur dans WebKit (app Mac) : chaque lettre tapée remplaçait la lettrine et
// le texte n'avançait plus. Pendant qu'on écrit le premier paragraphe, il reste donc en texte simple.

import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const key = new PluginKey<{ focused: boolean }>("cosmosDropCap");

/** Le premier paragraphe peut-il porter la lettrine ? Non s'il est vide, ou si l'on y écrit. */
export function dropCapAt(state: EditorState, focused: boolean): { from: number; to: number } | null {
  const first = state.doc.firstChild;
  if (!first || first.type.name !== "paragraph" || first.textContent.trim() === "") return null;
  const to = first.nodeSize;
  const { from: a, to: b } = state.selection;
  if (focused && a <= to && b >= 0 && a < to) return null;
  return { from: 0, to };
}

export const DropCap = Extension.create({
  name: "cosmosDropCap",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: () => ({ focused: false }),
          apply: (tr, value) => {
            const meta = tr.getMeta(key) as boolean | undefined;
            return meta === undefined ? value : { focused: meta };
          },
        },
        props: {
          decorations(state) {
            const range = dropCapAt(state, key.getState(state)?.focused ?? false);
            return range ? DecorationSet.create(state.doc, [Decoration.node(range.from, range.to, { class: "has-dropcap" })]) : null;
          },
          handleDOMEvents: {
            focus: (view) => {
              view.dispatch(view.state.tr.setMeta(key, true));
              return false;
            },
            blur: (view) => {
              view.dispatch(view.state.tr.setMeta(key, false));
              return false;
            },
          },
        },
      }),
    ];
  },
});
