// Vue Scénario d'un projet scénario : liste des scènes, feuille au format cinéma, panneau
// « Dans cette scène ». Le texte vit dans scenario.fountain (store.screenplay) : l'éditeur en est
// une lecture, reconvertie en modèle un court instant après chaque modification.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { SuggestionMenu } from "./SuggestionMenu";
import { minutesFor, usePagination } from "./usePagination";
import { suggest, type Suggestion } from "../screenplay/editor/autocomplete";
import { ADOPT_META, adoptNew } from "../screenplay/editor/adopt";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { fmt, getT } from "../i18n";
import { useVocab } from "../vocab";
import { isTouch } from "../platform";
import { EDITABLE_TYPES } from "../screenplay/model";
import { cardsWithoutScene, type SceneCard } from "../screenplay/link";
import { headingParts, listScenes, sceneAt, sceneCharacters, scenesInLocation, type Scene } from "../screenplay/scenes";
import {
  currentElement,
  fromDoc,
  screenplayExtensions,
  setElementType,
  toDoc,
  type EditableType,
} from "../screenplay/editor";

const EMIT_DELAY = 250; // ms après la dernière frappe, avant de reconvertir le document en modèle

/** Position, dans le document, du nœud de premier niveau d'index donné. */
function posOf(doc: PMNode, index: number): number {
  let pos = 0;
  for (let i = 0; i < index && i < doc.childCount; i++) pos += doc.child(i).nodeSize;
  return pos;
}

export function ScreenplayView() {
  const { t, types } = useVocab();
  const sp = t.screenplay;
  const lang = useSettings((s) => s.lang);
  const screenplay = useCosmos((s) => s.screenplay);
  const nodes = useCosmos((s) => s.nodes);
  const setView = useCosmos((s) => s.setView);
  const paper = useCosmos((s) => s.paper);
  const sceneNumbers = useCosmos((s) => s.sceneNumbers);
  const focusMode = useCosmos((s) => s.focusMode);
  const setFocusMode = useCosmos((s) => s.setFocusMode);

  // Mode focus : Cmd/Ctrl+Maj+F le bascule ; quitter la vue le termine.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFocusMode(!useCosmos.getState().focusMode);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      setFocusMode(false);
    };
  }, [setFocusMode]);
  const pagination = usePagination();

  const barRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<{ index: number; type: EditableType | null }>({ index: 0, type: null });

  // Complétion ouverte sous le curseur (personnages, décors, moments).
  const pageRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ items: Suggestion[]; active: number; style: CSSProperties } | null>(null);
  const menuRef = useRef(menu);
  menuRef.current = menu;

  /** Recalcule les suggestions pour l'élément en cours ; ferme le menu s'il n'y a rien à proposer. */
  const refreshMenu = (ed: Editor) => {
    const element = currentElement(ed.state);
    const { $from, empty } = ed.state.selection;
    // Seulement en fin d'élément : on complète ce qu'on est en train d'écrire.
    if (!element || !empty || $from.parentOffset !== element.node.content.size) return setMenu(null);
    if (element.type !== "character" && element.type !== "sceneHeading") return setMenu(null);
    const state = useCosmos.getState();
    const t = getT().screenplay;
    const titles = (type: string) => state.nodes.filter((n) => n.data.type === type && n.data.title.trim()).map((n) => n.data.title);
    const result = suggest(element.type, element.node.textContent, {
      characterCards: titles("personnage"),
      locationCards: titles("lieu"),
      // Le document de l'éditeur, plus frais que le store (reconverti avec un léger délai).
      elements: fromDoc(ed.state.doc.toJSON(), {}).elements,
      currentIndex: $from.index(0),
      locale: useSettings.getState().lang,
      moments: t.moments,
      extensions: t.extensions,
      labels: t.suggest,
    });
    const page = pageRef.current;
    if (result.items.length === 0 || !page) return setMenu(null);

    const caret = ed.view.coordsAtPos($from.pos);
    const box = page.getBoundingClientRect();
    const left = Math.max(8, Math.min(caret.left - box.left, box.width - 240));
    // Près du bas de l'écran (ou du clavier virtuel), le menu s'ouvre vers le haut.
    const visible = window.visualViewport?.height ?? window.innerHeight;
    const style: CSSProperties =
      caret.bottom > visible * 0.6
        ? { left, top: "auto", bottom: box.bottom - caret.top + 4 }
        : { left, top: caret.bottom - box.top + 4 };
    setMenu({ ...result, style });
  };
  const refreshRef = useRef(refreshMenu);
  refreshRef.current = refreshMenu;

  // Dernier modèle échangé avec le store : s'il change sans nous (autre dossier ouvert), on recharge.
  const synced = useRef(screenplay);
  // Document modifié mais pas encore reconverti.
  const pending = useRef<PMNode | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const emit = useCallback(() => {
    clearTimeout(timer.current);
    let doc = pending.current;
    if (!doc) return;
    pending.current = null;
    const ed = editorRef.current;
    // Une scène ou un personnage écrits à l'instant reçoivent leur carte sur le canevas.
    if (ed && !ed.isDestroyed && ed.state.doc === doc) {
      const host = {
        addCard: (type: "scene" | "personnage" | "lieu", title: string) => useCosmos.getState().addTitledCard(type, title),
        locationCards: () =>
          useCosmos
            .getState()
            .nodes.filter((n) => n.data.type === "lieu")
            .map((n) => ({ id: n.id, title: n.data.title })),
        linkSceneToLocation: (sceneId: string, locationId: string) =>
          useCosmos.getState().linkCards(sceneId, locationId, getT().screenplay.linkSetIn),
        characterCards: () =>
          useCosmos
            .getState()
            .nodes.filter((n) => n.data.type === "personnage")
            .map((n) => n.data.title),
        locale: useSettings.getState().lang,
      };
      doc = adoptNew(ed, host) ?? doc;
    }
    const next = fromDoc(doc.toJSON(), synced.current?.titlePage ?? {});
    synced.current = next;
    useCosmos.getState().setScreenplay(next);
  }, []);

  const pickRef = useRef<(index: number) => void>(() => {});
  const editorRef = useRef<Editor | null>(null);

  const track = (ed: Editor) => {
    const index = ed.state.selection.$from.index(0);
    const type = currentElement(ed.state)?.type ?? null;
    setCurrent((prev) => (prev.index === index && prev.type === type ? prev : { index, type }));
  };

  const extensions = useMemo(
    () =>
      screenplayExtensions({
        locale: () => useSettings.getState().lang,
        placeholder: (type) => getT().screenplay.placeholders[type],
        // Tab est pris par l'éditeur : Échap rend la main au clavier, sur la barre d'éléments.
        onEscape: () =>
          (
            barRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ??
            barRef.current?.querySelector<HTMLButtonElement>("button")
          )?.focus(),
      }),
    [],
  );

  const editor = useEditor({
    extensions,
    content: screenplay ? toDoc(screenplay) : undefined,
    immediatelyRender: true,
    editorProps: {
      attributes: { class: "sp-editor", role: "textbox", "aria-multiline": "true", "aria-label": getT().screenplay.editorAria },
      // Menu de complétion ouvert : flèches, Entrée et Échap sont pour lui (avant le clavier de l'éditeur).
      handleKeyDown: (_view, event) => {
        const open = menuRef.current;
        if (!open) return false;
        const count = open.items.length;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const step = event.key === "ArrowDown" ? 1 : -1;
          const from = open.active === -1 && step === -1 ? 0 : open.active;
          setMenu({ ...open, active: (from + step + count) % count });
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey && open.active >= 0) {
          pickRef.current(open.active);
          return true;
        }
        if (event.key === "Escape") {
          setMenu(null);
          return true;
        }
        return false;
      },
    },
    // Le menu suit la frappe ; déplacer le curseur sans rien écrire le referme.
    onTransaction: ({ editor: ed, transaction }) => {
      if (transaction.docChanged) refreshRef.current(ed);
      else if (transaction.selectionSet) setMenu(null);
    },
    // En quittant le texte (pour exporter, par exemple), ce qui attend part tout de suite dans le store.
    onBlur: () => {
      setMenu(null);
      emit();
    },
    onCreate: ({ editor: ed }) => track(ed),
    onSelectionUpdate: ({ editor: ed }) => track(ed),
    onUpdate: ({ editor: ed, transaction }) => {
      // Les liens posés par adoptNew ne sont pas une frappe : rien à reconvertir une seconde fois.
      if (transaction.getMeta(ADOPT_META)) return;
      pending.current = ed.state.doc;
      clearTimeout(timer.current);
      timer.current = setTimeout(emit, EMIT_DELAY);
      track(ed);
    },
  });

  editorRef.current = editor;

  // En quittant la vue, et avant Cmd/Ctrl+S, ce qui attend part tout de suite dans le store.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") emit();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      emit();
    };
  }, [emit]);

  // Le scénario a été remplacé ailleurs (ouverture d'un autre dossier) : on recharge l'éditeur.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !screenplay || screenplay === synced.current) return;
    synced.current = screenplay;
    pending.current = null;
    clearTimeout(timer.current);
    editor.commands.setContent(toDoc(screenplay), { emitUpdate: false });
  }, [editor, screenplay]);

  // Changement de langue : ce que TipTap a figé à la création (libellé, textes indicatifs).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: { class: "sp-editor", role: "textbox", "aria-multiline": "true", "aria-label": sp.editorAria },
      },
    });
    editor.view.dispatch(editor.state.tr.setMeta("cosmos:lang", lang));
  }, [lang, editor, sp.editorAria]);

  // Écran tactile : la barre d'éléments se pose juste au-dessus du clavier virtuel.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !isTouch()) return;
    const place = () => {
      const hidden = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      rootRef.current?.style.setProperty("--sp-keyboard", `${Math.round(hidden)}px`);
    };
    place();
    viewport.addEventListener("resize", place);
    viewport.addEventListener("scroll", place);
    return () => {
      viewport.removeEventListener("resize", place);
      viewport.removeEventListener("scroll", place);
    };
  }, []);

  const elements = useMemo(() => screenplay?.elements ?? [], [screenplay]);
  const scenes = useMemo(() => listScenes(elements), [elements]);
  const sceneCards = useMemo<SceneCard[]>(
    () => nodes.filter((n) => n.data.type === "scene").map((n) => ({ id: n.id, title: n.data.title })),
    [nodes],
  );
  const toWrite = useMemo(
    () => (screenplay ? cardsWithoutScene(screenplay, sceneCards) : []),
    [screenplay, sceneCards],
  );
  const scene = sceneAt(scenes, current.index);

  if (!editor || !screenplay) return null;

  const plural = (n: number, one: string, many: string) =>
    fmt(new Intl.PluralRules(lang).select(n) === "one" ? one : many, { n });

  const goTo = (index: number) => {
    emit();
    const pos = posOf(editor.state.doc, index);
    editor.chain().focus().setTextSelection(pos + 1).run();
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: "start" });
  };

  /** Une carte Scène sans texte : on ouvre sa scène à la fin du scénario. */
  const writeScene = (card: SceneCard) => {
    const { state, view } = editor;
    const { schema, doc } = state;
    const title = card.title.trim();
    const heading = schema.nodes.sceneHeading.create({ cardId: card.id, known: true }, title ? schema.text(title) : null);
    // Document encore vierge : la scène prend la place de la ligne vide.
    const blank = doc.childCount === 1 && doc.firstChild!.content.size === 0;
    const at = blank ? 0 : doc.content.size;
    const tr = blank
      ? state.tr.replaceWith(0, doc.content.size, [heading, schema.nodes.action.create()])
      : state.tr.insert(at, [heading, schema.nodes.action.create()]);
    // Titre déjà là : on écrit l'action. Sinon on commence par l'en-tête.
    tr.setSelection(TextSelection.create(tr.doc, title ? at + heading.nodeSize + 1 : at + 1));
    view.dispatch(tr.scrollIntoView());
    view.focus();
  };

  /** Choisir une suggestion : elle remplace le texte de l'élément, ou crée une carte. */
  const pick = (index: number) => {
    const item = menuRef.current?.items[index];
    const element = currentElement(editor.state);
    if (!item || !element) return;
    if (item.create) {
      const { addTitledCard, linkCards } = useCosmos.getState();
      const id = addTitledCard(item.create.type, item.create.title);
      // Un décor créé depuis l'en-tête d'une scène : un fil relie la scène à son décor.
      const sceneCard = element.node.attrs.cardId as string | null;
      if (item.create.type === "lieu" && sceneCard) linkCards(sceneCard, id, sp.linkSetIn);
      refreshMenu(editor);
      return;
    }
    if (item.text === undefined) return;
    const start = element.pos + 1;
    editor.view.dispatch(editor.state.tr.insertText(item.text, start, start + element.node.content.size).scrollIntoView());
    editor.view.focus();
  };
  pickRef.current = pick;

  /** Une scène écrite sans carte : on crée sa carte sur la toile, sous les autres. */
  const createCard = (target: Scene) => {
    emit();
    const id = useCosmos.getState().addTitledCard("scene", target.text);
    const pos = posOf(editor.state.doc, target.index);
    const node = editor.state.doc.nodeAt(pos);
    if (node?.type.name === "sceneHeading") {
      editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, null, { ...node.attrs, cardId: id, known: true }));
      emit();
    }
  };

  const card = scene?.cardId ? nodes.find((n) => n.id === scene.cardId && n.data.type === "scene")?.data : undefined;
  const location = scene ? headingParts(scene.text).location : "";
  const speakers = scene ? sceneCharacters(elements, scene) : [];

  // Libellés des éléments conservés, lus par le CSS (voir .sp-preserved::before).
  const labels = Object.fromEntries(
    Object.entries(sp.preserved).map(([kind, label]) => [`--sp-label-${kind}`, JSON.stringify(label)]),
  ) as CSSProperties;

  return (
    <div className={`screenplay${focusMode ? " is-focus" : ""}`} ref={rootRef}>
      <nav className="sp-scenes" aria-label={sp.scenesAria}>
        <div className="eyebrow">{sp.scenesTitle}</div>
        {scenes.length === 0 && <p className="sp-empty">{sp.scenesEmpty}</p>}
        <ol className="sp-scene-list">
          {scenes.map((s) => (
            <li key={s.index}>
              <button
                type="button"
                className={s.index === scene?.index ? "is-current" : ""}
                aria-current={s.index === scene?.index ? "true" : undefined}
                onClick={() => goTo(s.index)}
              >
                <span className="is-slugline">
                  {s.number}. {s.text || sp.untitledScene}
                </span>
                {pagination && pagination.startPage[s.index] !== undefined && (
                  <span className="sp-towrite">{fmt(sp.pageShort, { n: pagination.startPage[s.index] })}</span>
                )}
              </button>
            </li>
          ))}
        </ol>

        {toWrite.length > 0 && (
          <>
            <div className="eyebrow sp-towrite-title">{sp.toWriteTitle}</div>
            <ul className="sp-scene-list">
              {toWrite.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-label={fmt(sp.writeScene, { title: c.title || sp.untitledScene })}
                    onClick={() => writeScene(c)}
                  >
                    <span className="is-slugline">{c.title || sp.untitledScene}</span>
                    <span className="sp-towrite">{sp.toWrite}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="sp-center">
        {/* Petits écrans : la liste des scènes devient une liste déroulante. */}
        {scenes.length > 0 && (
          <select
            className="sp-scene-select"
            aria-label={sp.goToScene}
            value={scene ? String(scene.index) : ""}
            onChange={(e) => e.target.value !== "" && goTo(Number(e.target.value))}
          >
            {!scene && <option value="">{sp.goToScene}</option>}
            {scenes.map((s) => (
              <option key={s.index} value={s.index}>
                {s.number}. {s.text || sp.untitledScene}
              </option>
            ))}
          </select>
        )}

        <div className="sp-bar" role="toolbar" aria-label={sp.barAria} ref={barRef}>
          {EDITABLE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={current.type === type}
              // Le focus reste dans le texte, à la souris comme au doigt.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.view.focus();
                setElementType(type)(editor.state, editor.view.dispatch);
              }}
            >
              {sp.elements[type]}
            </button>
          ))}
          <span className="sp-bar-hint">
            <kbd>{sp.keyTab}</kbd> {sp.hintTab} · <kbd>{sp.keyEnter}</kbd> {sp.hintEnter} · <kbd>{sp.keyEscape}</kbd>{" "}
            {sp.hintEscape}
          </span>
          <button
            type="button"
            className="sp-focus"
            aria-pressed={focusMode}
            title={sp.focusHint}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setFocusMode(!focusMode)}
          >
            {focusMode ? sp.focusExit : sp.focus}
          </button>
        </div>
        <div className="sr-only" aria-live="polite">
          {current.type ? sp.elements[current.type] : ""}
        </div>
        {/* La suggestion active est annoncée : le focus reste dans le texte. */}
        <div className="sr-only" aria-live="polite">
          {menu && menu.active >= 0 ? `${menu.items[menu.active].label}, ${menu.items[menu.active].hint}` : ""}
        </div>

        <div className="sp-scroll">
          <div className="sp-page" data-paper={paper} data-numbers={sceneNumbers ? "" : undefined} style={labels} lang={lang} ref={pageRef}>
            <EditorContent editor={editor} />
            {menu && (
              <SuggestionMenu
                title={sp.suggest.title}
                className="sp-suggest"
                style={menu.style}
                items={menu.items}
                active={menu.active}
                onPick={pick}
              />
            )}
          </div>
        </div>
        {/* Pied de page : position dans le scénario et durée estimée. */}
        {pagination && pagination.pages > 0 && (
          <p className="sp-footer" role="status">
            {fmt(sp.pageOf, { page: pagination.startPage[Math.min(current.index, pagination.startPage.length - 1)] ?? 1, pages: pagination.pages })}
            {" · "}
            {fmt(sp.minutes, { n: minutesFor(pagination.pages) })}
          </p>
        )}
      </div>

      <aside className="sp-side" aria-label={sp.inSceneTitle}>
        <div className="eyebrow">{sp.inSceneTitle}</div>
        {!scene ? (
          <p className="sp-empty">{sp.noScene}</p>
        ) : (
          <>
            <section className="sp-box">
              <div className="eyebrow" style={{ color: "var(--type-scene)" }}>
                {types.scene.label}
              </div>
              <div className="is-slugline sp-box-title">{scene.text || sp.untitledScene}</div>
              {card ? (
                <>
                  {card.html && (
                    // HTML produit par TipTap ou nettoyé au chargement (voir sanitizeHtml).
                    <div className="sp-card-body" dangerouslySetInnerHTML={{ __html: card.html }} />
                  )}
                  <button type="button" className="link-button" onClick={() => setView("toile", card.id)}>
                    {t.bible.seeOnCanvas}
                  </button>
                </>
              ) : (
                <>
                  <p className="sp-empty">{sp.noCard}</p>
                  <button type="button" className="ghost-button" onClick={() => createCard(scene)}>
                    {sp.createCard}
                  </button>
                </>
              )}
            </section>

            {location && (
              <section className="sp-box">
                <div className="eyebrow" style={{ color: "var(--type-lieu)" }}>
                  {types.lieu.label}
                </div>
                <div className="is-slugline sp-box-title">{location}</div>
                <p className="sp-detail">
                  {plural(scenesInLocation(scenes, location, lang), sp.locationScenesOne, sp.locationScenesMany)}
                </p>
              </section>
            )}

            <section className="sp-box">
              <div className="eyebrow" style={{ color: "var(--type-personnage)" }}>
                {sp.characters}
              </div>
              {speakers.length === 0 ? (
                <p className="sp-empty">{sp.noCharacters}</p>
              ) : (
                <ul className="sp-speakers">
                  {speakers.map((c) => (
                    <li key={c.name}>
                      <span>{c.name}</span>
                      <span className="sp-detail">{plural(c.lines, sp.linesOne, sp.linesMany)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
