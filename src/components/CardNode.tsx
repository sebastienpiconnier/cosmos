// Une carte sur la toile : en-tête (type + titre, sert de poignée de déplacement)
// et corps éditable avec TipTap. Le menu « Transformer en… » s'ouvre de deux façons :
// en tapant "/" en début de ligne (clavier) ou en touchant l'étiquette du type
// (souris, doigt, et sans clavier physique sur mobile).

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Handle, Position, useConnection, type NodeProps } from "@xyflow/react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { CARD_TYPES, typeInfo, type CardType } from "../types";
import { useCosmos, type CardNode as CardNodeT } from "../store";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const TITLE_PLACEHOLDER: Record<CardType, string> = {
  idee: "Titre (facultatif)",
  personnage: "Nom du personnage",
  lieu: "Nom du lieu",
  scene: "Titre de la scène",
  theme: "Thème",
  question: "La question",
};

/** Menu ouvert par "/" (avec la plage de texte à effacer) ou par l'étiquette du type. */
type MenuState = { via: "slash"; from: number; to: number; query: string } | { via: "label"; query: "" };

function CardNodeImpl({ id, data, selected }: NodeProps<CardNodeT>) {
  const updateCard = useCosmos((s) => s.updateCard);
  const deleteCard = useCosmos((s) => s.deleteCard);
  const info = typeInfo(data.type);

  const [slash, setSlash] = useState<MenuState | null>(null);
  const [active, setActive] = useState(0);
  // Près du bas de l'écran (petits écrans, bouton « Nouvelle carte »), le menu s'ouvre vers le haut.
  const [menuUp, setMenuUp] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const openMenu = (menu: MenuState | null) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (menu && rect) setMenuUp(rect.bottom > window.innerHeight * 0.6);
    setSlash(menu);
  };
  const options = useMemo(
    () => (slash ? CARD_TYPES.filter((t) => norm(t.label).includes(norm(slash.query))) : []),
    [slash],
  );

  // Refs pour que les gestionnaires TipTap (créés une seule fois) voient l'état courant.
  const stateRef = useRef({ slash, options, active });
  stateRef.current = { slash, options, active };

  const pick = (type: CardType) => {
    const s = stateRef.current.slash;
    if (s?.via === "slash" && editor) editor.chain().focus().deleteRange({ from: s.from, to: s.to }).run();
    updateCard(id, { type });
    setSlash(null);
  };
  const pickRef = useRef(pick);
  pickRef.current = pick;

  const detectSlash = (ed: Editor) => {
    const { $from, empty } = ed.state.selection;
    const text = $from.parent.textContent;
    if (empty && $from.parent.type.name === "paragraph" && /^\/[^\s/]{0,20}$/.test(text)) {
      const fresh = stateRef.current.slash?.via !== "slash";
      const menu: MenuState = { via: "slash", from: $from.start(), to: $from.end(), query: text.slice(1) };
      if (fresh) openMenu(menu);
      else setSlash(menu);
      setActive(0);
    } else if (stateRef.current.slash?.via === "slash") {
      setSlash(null);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "Écris… ( / pour transformer la carte )" }),
    ],
    content: data.html,
    immediatelyRender: true,
    editorProps: {
      attributes: { class: "card-editor", "aria-label": "Contenu de la carte" },
      handleKeyDown: (_view, event) => {
        const { slash: s, options: opts, active: a } = stateRef.current;
        if (!s || !opts.length) return false;
        if (event.key === "ArrowDown") {
          setActive((a + 1) % opts.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setActive((a - 1 + opts.length) % opts.length);
          return true;
        }
        if (event.key === "Enter") {
          pickRef.current(opts[a].type);
          return true;
        }
        if (event.key === "Escape") {
          setSlash(null);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateCard(id, { html: ed.getHTML() });
      detectSlash(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => detectSlash(ed),
  });

  // Menu ouvert depuis l'étiquette : on le ferme avec Échap, en touchant ailleurs
  // ou quand la carte n'est plus sélectionnée.
  const labelMenuOpen = slash?.via === "label";
  useEffect(() => {
    if (!labelMenuOpen) return;
    if (!selected) {
      setSlash(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSlash(null);
    };
    const onDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) setSlash(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [labelMenuOpen, selected]);

  // Pendant qu'on tire un fil, toute la carte devient une cible de dépôt.
  const connection = useConnection();
  const isDropTarget = connection.inProgress && connection.fromNode?.id !== id;

  // Nouvelle carte : on écrit tout de suite dedans.
  const pendingFocus = useCosmos((s) => s.pendingFocusId === id);
  useEffect(() => {
    if (!pendingFocus || !editor) return;
    // React Flow masque un nœud tant qu'il n'est pas mesuré : on réessaie brièvement.
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tryFocus = () => {
      editor.commands.focus("end");
      if (editor.isFocused || tries++ > 10) useCosmos.getState().clearPendingFocus();
      else timer = setTimeout(tryFocus, 30);
    };
    tryFocus();
    return () => clearTimeout(timer);
  }, [pendingFocus, editor]);

  return (
    <div ref={cardRef} className={`card${selected ? " is-selected" : ""}`} style={{ ["--type" as string]: info.color }}>
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={Position[(side[0].toUpperCase() + side.slice(1)) as keyof typeof Position]}
          className="card-port"
        />
      ))}

      {isDropTarget && <Handle id="drop" type="target" position={Position.Top} className="card-dropzone" />}

      <div className="card-handle">
        <button
          type="button"
          className="card-type nodrag"
          aria-haspopup="listbox"
          aria-expanded={slash?.via === "label"}
          aria-label={`Type : ${info.label}. Changer le type`}
          onClick={() => {
            setActive(Math.max(0, CARD_TYPES.findIndex((t) => t.type === data.type)));
            openMenu(slash?.via === "label" ? null : { via: "label", query: "" });
          }}
        >
          <span className="card-dot" />
          {info.label}
        </button>
        <button
          type="button"
          className="card-delete nodrag"
          aria-label="Supprimer la carte"
          onClick={() => deleteCard(id)}
        >
          ×
        </button>
      </div>

      <input
        className="card-title nodrag"
        value={data.title}
        placeholder={TITLE_PLACEHOLDER[data.type]}
        aria-label="Titre de la carte"
        onChange={(e) => updateCard(id, { title: e.target.value })}
      />

      <div className="nodrag nowheel nopan">
        <EditorContent editor={editor} />
      </div>

      {slash && options.length > 0 && (
        <div className={`slash-menu nodrag${menuUp ? " opens-up" : ""}`} role="listbox" aria-label="Transformer en">
          <div className="slash-title">Transformer en…</div>
          {options.map((t, i) => (
            <button
              key={t.type}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`slash-item${i === active ? " is-active" : ""}`}
              onPointerDown={(e) => e.preventDefault() /* garde le focus dans l'éditeur */}
              onClick={() => pick(t.type)}
            >
              <span className="card-dot" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const CardNode = memo(CardNodeImpl);
