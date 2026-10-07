// Manuscrit (vue Manuscrit d'un projet roman) : on écrit une scène à la fois, dans l'ordre du Plan.
// À gauche les scènes et leur nombre de mots, au centre le texte, à droite « Dans cette scène » :
// les personnages et lieux cités dans le texte, et les notes de la carte, sous les yeux pendant l'écriture.
// Le titre reste celui de la carte ; le texte vit dans manuscrit/<id>.md.

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCosmos, planScenes } from "../store";
import { useSettings } from "../settings";
import { fmt, getT, useT } from "../i18n";
import { typeColor } from "../types";
import { planOrder } from "../plan";
import { countWords, detectCards, orphanTexts, totalWords } from "../manuscript";
import { plainText } from "../search";

/** Éditeur du texte d'une scène. Remonté à chaque changement de scène (`key`), pour repartir d'un historique vide. */
function SceneEditor({ id, title }: { id: string; title: string }) {
  const lang = useSettings((s) => s.lang);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      // Fonction : relue à chaque rendu, donc suit le changement de langue.
      Placeholder.configure({ placeholder: () => getT().manuscript.placeholder }),
    ],
    content: useCosmos.getState().manuscript[id] ?? "",
    immediatelyRender: true,
    editorProps: { attributes: { class: "ms-editor", "aria-label": fmt(getT().manuscript.editorAria, { title }) } },
    onUpdate: ({ editor: ed }) => useCosmos.getState().setManuscriptText(id, ed.getHTML()),
  });

  // Langue ou titre changés : on met à jour ce que TipTap a figé à la création.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setOptions({
      editorProps: { ...editor.options.editorProps, attributes: { class: "ms-editor", "aria-label": fmt(getT().manuscript.editorAria, { title }) } },
    });
    editor.view.dispatch(editor.state.tr.setMeta("cosmos:lang", lang));
  }, [lang, title, editor]);

  return <EditorContent editor={editor} />;
}

export function Manuscript() {
  const t = useT();
  const m = t.manuscript;
  const lang = useSettings((s) => s.lang);
  const nodes = useCosmos((s) => s.nodes);
  const plan = useCosmos((s) => s.plan);
  const manuscript = useCosmos((s) => s.manuscript);
  const updateCard = useCosmos((s) => s.updateCard);
  const addTitledCard = useCosmos((s) => s.addTitledCard);
  const revealCard = useCosmos((s) => s.revealCard);
  const restoreScene = useCosmos((s) => s.restoreScene);

  const cards = useMemo(() => nodes.map((n) => n.data), [nodes]);
  const sceneIds = useMemo(() => planScenes(nodes), [nodes]);
  const order = useMemo(() => planOrder(plan, sceneIds), [plan, sceneIds]);
  const orphans = useMemo(() => orphanTexts(manuscript, sceneIds), [manuscript, sceneIds]);

  const [chosen, setChosen] = useState<string | null>(null);
  const current = chosen && order.includes(chosen) ? chosen : (order[0] ?? null);
  const card = cards.find((c) => c.id === current);
  const [draft, setDraft] = useState("");
  const mainRef = useRef<HTMLDivElement>(null);

  const words = (n: number) => fmt(new Intl.PluralRules(lang).select(n) === "one" ? m.wordsOne : m.wordsMany, { n: new Intl.NumberFormat(lang).format(n) });
  const go = (id: string) => {
    setChosen(id);
    mainRef.current?.scrollTo(0, 0);
  };

  if (!current || !card) {
    return (
      <div className="empty-view ms-empty">
        <h1>{m.empty}</h1>
        <p>{m.emptyBody}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) setChosen(addTitledCard("scene", draft.trim()));
            setDraft("");
          }}
        >
          <input value={draft} placeholder={m.newScene} aria-label={m.newScene} onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" disabled={!draft.trim()}>
            {m.add}
          </button>
        </form>
        <Orphans ids={orphans} manuscript={manuscript} onRestore={restoreScene} />
      </div>
    );
  }

  const at = order.indexOf(current);
  const title = card.title.trim() || m.untitled;
  const detected = detectCards(manuscript[current], cards);

  return (
    <div className="manuscript">
      <nav className="sp-scenes ms-scenes" aria-label={m.scenesAria}>
        <h2 className="sp-box-title">{m.scenesTitle}</h2>
        <p className="ms-total">{words(totalWords(manuscript, order))}</p>
        <ol className="sp-scene-list">
          {order.map((id, i) => {
            const c = cards.find((x) => x.id === id);
            const count = countWords(manuscript[id]);
            return (
              <li key={id}>
                <button type="button" className={id === current ? "is-current" : ""} aria-current={id === current ? "true" : undefined} onClick={() => go(id)}>
                  <span className="ms-name">
                    {i + 1}. {c?.title.trim() || m.untitled}
                  </span>
                  {count > 0 && <span className="ms-words">{new Intl.NumberFormat(lang).format(count)}</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <Orphans ids={orphans} manuscript={manuscript} onRestore={restoreScene} />
      </nav>

      <div className="ms-main" ref={mainRef}>
        <div className="ms-sheet">
          <input
            className="ms-title"
            value={card.title}
            placeholder={m.untitled}
            aria-label={m.sceneTitle}
            onChange={(e) => updateCard(current, { title: e.target.value })}
          />
          <div className="ms-meta">
            <button type="button" className="icon-button" disabled={at === 0} aria-label={m.previous} title={m.previous} onClick={() => go(order[at - 1])}>
              <span aria-hidden="true">←</span>
            </button>
            <button type="button" className="icon-button" disabled={at === order.length - 1} aria-label={m.next} title={m.next} onClick={() => go(order[at + 1])}>
              <span aria-hidden="true">→</span>
            </button>
            <span>{fmt(m.position, { n: at + 1, total: order.length })}</span>
            <span aria-live="polite">{words(countWords(manuscript[current]))}</span>
          </div>
          <SceneEditor key={current} id={current} title={title} />
        </div>
      </div>

      <aside className="sp-side">
        <section className="sp-box">
          <h2 className="sp-box-title">{m.inScene}</h2>
          {detected.length === 0 ? (
            <p className="sp-empty">{m.nothingDetected}</p>
          ) : (
            <ul className="ms-chips">
              {detected.map((c) => (
                <li key={c.id}>
                  <button type="button" className="chip" title={fmt(m.show, { title: c.title })} onClick={() => revealCard(c.id)}>
                    <span className="card-dot" style={{ background: typeColor(c.type) }} />
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="sp-box">
          <h2 className="sp-box-title">{m.notes}</h2>
          {/* HTML déjà nettoyé : il vient de l'éditeur de la carte, ou du disque via sanitizeHtml. */}
          {card.html && plainText(card.html) ? <div className="ms-notes" dangerouslySetInnerHTML={{ __html: card.html }} /> : <p className="sp-empty">{m.noNotes}</p>}
          <button type="button" className="chip" onClick={() => revealCard(current)}>
            {fmt(m.show, { title })}
          </button>
        </section>
      </aside>
    </div>
  );
}

/** Textes dont la carte a été supprimée : jamais effacés, on peut recréer la carte. */
function Orphans({ ids, manuscript, onRestore }: { ids: string[]; manuscript: Record<string, string>; onRestore: (id: string) => void }) {
  const m = useT().manuscript;
  if (ids.length === 0) return null;
  return (
    <section aria-label={m.orphans}>
      <h2 className="sp-box-title">{m.orphans}</h2>
      <p className="sp-empty">{m.orphansHint}</p>
      {ids.map((id) => {
        const text = plainText(manuscript[id]);
        return (
          <div key={id} className="ms-orphan">
            <span>{text.length > 90 ? `${text.slice(0, 90)}…` : text}</span>
            <button type="button" onClick={() => onRestore(id)}>
              {m.restore}
            </button>
          </div>
        );
      })}
    </section>
  );
}
