// Texte d'une fiche de la Bible, modifiable sur place : c'est le corps de la carte, le même que sur le
// canevas. Une fiche vide montre « À creuser… » en texte indicatif, et l'on écrit directement dedans.

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCosmos } from "../store";
import { fmt, getT } from "../i18n";
import { useSettings } from "../settings";
import { MentionNode } from "./MentionNode";
import type { CardData } from "../types";

const attributes = (title: string) => ({
  class: "bible-editor",
  "aria-label": title.trim() ? fmt(getT().bible.bodyAria, { title: title.trim() }) : getT().bible.bodyAriaUntitled,
});

export function BibleBody({ card }: { card: CardData }) {
  const lang = useSettings((s) => s.lang);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      // Fonction : relue à chaque rendu, donc suit le changement de langue.
      Placeholder.configure({ placeholder: () => getT().bible.toDig }),
      MentionNode,
    ],
    content: card.html,
    immediatelyRender: true,
    editorProps: { attributes: attributes(card.title) },
    onUpdate: ({ editor: ed }) => useCosmos.getState().updateCard(card.id, { html: ed.getHTML() }),
  });

  // Texte changé ailleurs (annuler, réponse de l'assistant, synthèse ajoutée) : l'éditeur suit.
  useEffect(() => {
    if (!editor || editor.isDestroyed || card.html === editor.getHTML()) return;
    if (card.html === "" && editor.isEmpty) return;
    editor.commands.setContent(card.html, { emitUpdate: false });
  }, [card.html, editor]);

  // Langue ou titre changés : on met à jour ce que TipTap a figé à la création.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setOptions({ editorProps: { ...editor.options.editorProps, attributes: attributes(card.title) } });
    editor.view.dispatch(editor.state.tr.setMeta("cosmos:lang", lang));
  }, [lang, card.title, editor]);

  return (
    <div className="bible-body">
      <EditorContent editor={editor} />
    </div>
  );
}
