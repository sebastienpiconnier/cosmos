// Schéma de l'éditeur de scénario : un nœud bloc par élément, sans mise en forme.
// Le texte d'un élément peut contenir des retours à la ligne (« \n », gardés tels quels).

import { Node, mergeAttributes } from "@tiptap/react";
import { EDITABLE_TYPES, type ElementType } from "../model";

export type EditableType = (typeof EDITABLE_TYPES)[number];
export const isEditableType = (name: string): name is EditableType =>
  (EDITABLE_TYPES as readonly string[]).includes(name);

/** Éléments conservés tels quels (note, section, texte mis de côté…) : affichés, non éditables. */
export const PRESERVED = "preserved";
export type PreservedKind = Exclude<ElementType, EditableType>;

const text = (name: string) => ({
  default: null as string | null,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`),
  renderHTML: (attrs: Record<string, unknown>) => (attrs[name] ? { [`data-${name}`]: String(attrs[name]) } : {}),
});

const flag = (name: string) => ({
  default: false,
  parseHTML: (el: HTMLElement) => el.hasAttribute(`data-${name}`),
  renderHTML: (attrs: Record<string, unknown>) => (attrs[name] ? { [`data-${name}`]: "" } : {}),
});

function element(name: EditableType, attributes: Record<string, ReturnType<typeof text> | ReturnType<typeof flag>>) {
  return Node.create({
    name,
    group: "block",
    content: "text*",
    marks: "",
    whitespace: "pre",
    defining: true,
    addAttributes: () => attributes,
    parseHTML() {
      const own = { tag: `p[data-el="${name}"]`, preserveWhitespace: "full" as const };
      // Texte collé depuis ailleurs : chaque paragraphe devient de l'action.
      return name === "action" ? [own, { tag: "p", priority: 10 }, { tag: "div", priority: 10 }] : [own];
    },
    renderHTML({ HTMLAttributes }) {
      return ["p", mergeAttributes(HTMLAttributes, { "data-el": name, class: `sp-el sp-${name}` }), 0];
    },
  });
}

export const Doc = Node.create({ name: "doc", topNode: true, content: "block+" });

// L'action est déclarée en premier : c'est le type par défaut d'un document vide.
export const Action = element("action", { forced: flag("forced") });
export const SceneHeading = element("sceneHeading", {
  cardId: text("card"),
  sceneNumber: text("number"),
  forced: flag("forced"),
});
export const Character = element("character", { dual: flag("dual"), forced: flag("forced") });
export const Parenthetical = element("parenthetical", {});
export const Dialogue = element("dialogue", {});
export const Transition = element("transition", { forced: flag("forced") });

// Le libellé de chaque sorte (« Note », « Section »…) est posé en CSS : il suit la langue sans redessiner.
export const Preserved = Node.create({
  name: PRESERVED,
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      kind: {
        default: "note",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-preserved"),
        renderHTML: () => ({}),
      },
      text: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-text") ?? "",
        renderHTML: () => ({}),
      },
      depth: {
        default: null as number | null,
        parseHTML: (el: HTMLElement) => Number(el.getAttribute("data-depth")) || null,
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML: () => [{ tag: "div[data-preserved]" }],
  renderHTML({ node }) {
    const { kind, text: content, depth } = node.attrs as { kind: PreservedKind; text: string; depth: number | null };
    const attrs: Record<string, string> = {
      "data-preserved": kind,
      "data-text": content,
      class: "sp-preserved",
      contenteditable: "false",
    };
    if (depth) attrs["data-depth"] = String(depth);
    return ["div", attrs, content.trim()];
  },
});
