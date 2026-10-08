// Mode focus du manuscrit, côté éditeur : la phrase ou le paragraphe en cours reste en pleine encre, le
// reste s'estompe (décorations ProseMirror, rien n'est écrit dans le texte). Le mode « ligne » est un
// voile posé par Manuscript.tsx autour de la ligne du curseur, et la machine à écrire y est gérée aussi.

import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { sentenceAt, type FocusHighlight } from "../focusText";

export const focusKey = new PluginKey<DecorationSet>("cosmosFocus");

export const FocusWriting = Extension.create<{ mode: () => FocusHighlight }>({
  name: "cosmosFocus",
  addOptions: () => ({ mode: () => "off" as FocusHighlight }),
  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key: focusKey,
        props: {
          decorations(state) {
            const mode = options.mode();
            if (mode !== "sentence" && mode !== "paragraph") return null;
            const { $head } = state.selection;
            if ($head.depth < 1) return null;
            // Le bloc de premier niveau du curseur (paragraphe, titre, liste entière).
            const start = $head.before(1);
            const node = state.doc.nodeAt(start);
            if (!node) return null;
            if (mode === "paragraph") return DecorationSet.create(state.doc, [Decoration.node(start, start + node.nodeSize, { class: "is-focus-on" })]);
            // Phrase : dans le bloc de texte du curseur ; un caractère par feuille pour garder les positions.
            const parent = $head.parent;
            if (!parent.isTextblock) return null;
            const text = parent.textBetween(0, parent.content.size, undefined, "￼");
            const { from, to } = sentenceAt(text, $head.parentOffset);
            if (to <= from) return null;
            const base = $head.start();
            return DecorationSet.create(state.doc, [Decoration.inline(base + from, base + to, { class: "is-focus-on" })]);
          },
        },
      }),
    ];
  },
});
