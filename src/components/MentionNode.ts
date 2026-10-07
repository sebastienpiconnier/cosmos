// Nœud TipTap d'une mention « @ » : un bloc insécable dans le texte, qui porte l'identifiant de la carte citée.
// Maison plutôt que l'extension Mention de TipTap : le menu de suggestions est déjà le nôtre (SuggestionMenu).

import { Node } from "@tiptap/react";
import { isCardId } from "../mentions";

export const MentionNode = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      id: { default: "", rendered: false },
      label: { default: "", rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-mention]",
        getAttrs: (el) => {
          const id = el.getAttribute("data-mention");
          return isCardId(id) ? { id, label: (el.textContent ?? "").replace(/^@/, "") } : false;
        },
      },
    ];
  },

  // Même forme que `mentionHtml` (mentions.ts) : le store la relit quand une carte est renommée.
  renderHTML({ node }) {
    return ["span", { "data-mention": node.attrs.id }, `@${node.attrs.label}`];
  },

  renderText({ node }) {
    return `@${node.attrs.label}`;
  },
});
