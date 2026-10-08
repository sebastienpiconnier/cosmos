// Extensions communes aux éditeurs de texte (cartes, Bible, manuscrit) : la même mise en forme partout.
// - Markdown à la frappe : **gras**, *italique*, ~~barré~~, `# ` titre, `- ` liste, `1. ` liste numérotée,
//   `> ` citation, `[ ] ` case à cocher, ==à reprendre== (règles de saisie de TipTap).
// - Markdown au collage : un texte brut en Markdown arrive mis en forme (MarkdownPaste).
// - Cases à cocher (listes de tâches), enregistrées en Markdown standard `- [ ]` / `- [x]`.
// - « À reprendre » : un passage surligné, comme les marques de NEO (Cmd/Ctrl+Maj+X), enregistré en <mark>.
// Raccourcis : Cmd/Ctrl+B gras, +I italique, +Maj+X à reprendre, +Maj+9 case à cocher, +Maj+8 liste,
// +Maj+7 liste numérotée, +Maj+B citation, +Alt+1 à 3 titres.

import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Highlight from "@tiptap/extension-highlight";
import { markdownToHtml } from "../storage/markdown";
import { looksLikeMarkdown, markHighlights } from "../markdownText";

/** Texte brut collé en Markdown : converti en texte mis en forme. Le HTML collé garde son chemin habituel. */
export const MarkdownPaste = Extension.create({
  name: "cosmosMarkdownPaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("cosmosMarkdownPaste"),
        props: {
          handlePaste: (_view, event) => {
            const data = event.clipboardData;
            if (!data || data.types.includes("text/html")) return false;
            const text = data.getData("text/plain");
            if (!text || !looksLikeMarkdown(text)) return false;
            const html = markdownToHtml(markHighlights(text));
            if (!html) return false;
            editor.commands.insertContent(html);
            return true;
          },
        },
      }),
    ];
  },
});

/** « À reprendre » : Cmd/Ctrl+Maj+X en plus du raccourci d'origine. */
const Revisit = Highlight.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      "Mod-Shift-x": () => this.editor.commands.toggleHighlight(),
    };
  },
});

export function richTextExtensions({ link = true }: { link?: boolean } = {}) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, ...(link ? {} : { link: false }) }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Revisit,
    MarkdownPaste,
  ];
}
