// Manuscrit (vue Manuscrit d'un projet roman) : on écrit une scène à la fois, dans l'ordre du Plan.
// À gauche les scènes, regroupées par chapitre, et leur nombre de mots ; au centre le texte, mis en
// pages comme un livre (la numérotation continue d'une scène à l'autre) ; à droite les statistiques
// et objectifs, puis « Dans cette scène » : les personnages et lieux cités, et les notes de la carte.
// Le titre reste celui de la carte ; le texte vit dans manuscrit/<id>.md.

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCosmos, planScenes } from "../store";
import { useSettings } from "../settings";
import { fmt, getT, useT } from "../i18n";
import { typeColor } from "../types";
import { chapterNumbers, chapterOf, groupByChapter, planOrder, type Chapter } from "../plan";
import { countWords, detectCards, orphanTexts } from "../manuscript";
import { plainText } from "../search";
import { Pages } from "../screenplay/editor/pages";
import { dayKey, firstPageOf, manuscriptStats, pagesFor, streak, wordsOn, WORDS_PER_PAGE } from "../stats";

/** Page du manuscrit à l'écran, en em : format livre (2:3), environ 250 mots par page. */
const PAGE = { width: 34, height: 51, marginTop: 5, marginBottom: 5, lineHeight: 1.6 };
/** En dessous de cette largeur (px), la feuille redevient continue. */
const PAGE_MIN_WIDTH = 460;

/** Éditeur du texte d'une scène. Remonté à chaque changement de scène (`key`), pour repartir d'un historique vide. */
function SceneEditor({ id, title, firstPage, onPages }: { id: string; title: string; firstPage: number; onPages: (n: number) => void }) {
  const lang = useSettings((s) => s.lang);
  const firstRef = useRef(firstPage);
  firstRef.current = firstPage;
  const onPagesRef = useRef(onPages);
  onPagesRef.current = onPages;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      // Fonction : relue à chaque rendu, donc suit le changement de langue.
      Placeholder.configure({ placeholder: () => getT().manuscript.placeholder }),
      // Vraies pages, comme dans un livre : la hauteur des paragraphes est mesurée à l'écran.
      Pages.configure({
        geometry: () => {
          const lines = (PAGE.height - PAGE.marginTop - PAGE.marginBottom) / PAGE.lineHeight;
          return { lines: lines * PAGE.lineHeight, pageLines: PAGE.height, marginTop: PAGE.marginTop };
        },
        enabled: (dom) => (dom.closest(".ms-main")?.clientWidth ?? 0) - 32 > PAGE_MIN_WIDTH,
        item: (type) => ({ margin: 0, keep: type === "heading" ? 3 : 0 }),
        firstPage: () => firstRef.current,
        label: (page) => String(page),
        onLayout: (n) => onPagesRef.current(n),
      }),
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
  // Pages de la scène à l'écran, mesurées par l'éditeur (0 : feuille continue).
  const [measured, setMeasured] = useState(0);

  const stats = useMemo(() => manuscriptStats(manuscript, order), [manuscript, order]);
  const numbers = useMemo(() => chapterNumbers(plan, order), [plan, order]);
  const chapterName = (chapter: Chapter) => {
    const n = numbers.get(chapter.id) ?? 0;
    return chapter.title.trim() ? fmt(t.chapters.numberedTitle, { n, title: chapter.title.trim() }) : fmt(t.chapters.numbered, { n });
  };

  const num = (n: number) => new Intl.NumberFormat(lang).format(n);
  const words = (n: number) => fmt(new Intl.PluralRules(lang).select(n) === "one" ? m.wordsOne : m.wordsMany, { n: num(n) });
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
  const before = order.slice(0, at).reduce((sum, id) => sum + (stats.perScene.get(id) ?? 0), 0);
  const chapter = chapterOf(plan, current);
  // La scène ouvre son chapitre : le titre du chapitre s'affiche au-dessus, comme dans un livre.
  const opensChapter = !!chapter && (at === 0 || chapterOf(plan, order[at - 1])?.id !== chapter.id);
  const sceneWords = countWords(manuscript[current]);

  return (
    <div className="manuscript">
      <nav className="sp-scenes ms-scenes" aria-label={m.scenesAria}>
        <h2 className="sp-box-title">{m.scenesTitle}</h2>
        <p className="ms-total">{words(stats.words)}</p>
        {groupByChapter(plan, order).map((group) => (
          <div key={`${group.chapter?.id ?? "none"}-${group.ids[0]}`} className={group.chapter ? "ms-chapter" : undefined}>
            {group.chapter && (
              <h3 className="ms-chapter-title">
                <span>{chapterName(group.chapter)}</span>
                <span className="ms-words">{num(group.ids.reduce((sum, id) => sum + (stats.perScene.get(id) ?? 0), 0))}</span>
              </h3>
            )}
            <ol className="sp-scene-list" start={order.indexOf(group.ids[0]) + 1}>
              {group.ids.map((id) => {
                const c = cards.find((x) => x.id === id);
                const count = stats.perScene.get(id) ?? 0;
                return (
                  <li key={id}>
                    <button type="button" className={id === current ? "is-current" : ""} aria-current={id === current ? "true" : undefined} onClick={() => go(id)}>
                      <span className="ms-name">
                        {order.indexOf(id) + 1}. {c?.title.trim() || m.untitled}
                      </span>
                      {count > 0 && <span className="ms-words">{num(count)}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
        <Orphans ids={orphans} manuscript={manuscript} onRestore={restoreScene} />
      </nav>

      <div className="ms-main" ref={mainRef}>
        <div className="ms-sheet">
          {opensChapter && chapter && <p className="ms-chapter-heading">{chapterName(chapter)}</p>}
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
            <span aria-live="polite">{words(sceneWords)}</span>
            {measured > 0 && <span>{fmt(t.stats.pagesFrom, { first: firstPageOf(before), last: firstPageOf(before) + measured - 1 })}</span>}
          </div>
          <div className={`ms-page${opensChapter ? " opens-chapter" : ""}`} style={{ ["--ms-width" as string]: PAGE.width, ["--ms-height" as string]: PAGE.height }}>
            <SceneEditor key={current} id={current} title={title} firstPage={firstPageOf(before)} onPages={(n) => setMeasured((prev) => (prev === n ? prev : n))} />
          </div>
        </div>
      </div>

      <aside className="sp-side">
        <StatsBox stats={stats} chapters={numbers.size} sceneWords={sceneWords} />
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

/** Statistiques et objectifs (idée reprise de NEO : objectif du jour, objectif du livre, jours d'affilée). */
function StatsBox({ stats, chapters, sceneWords }: { stats: ReturnType<typeof manuscriptStats>; chapters: number; sceneWords: number }) {
  const t = useT();
  const s = t.stats;
  const lang = useSettings((x) => x.lang);
  const goals = useCosmos((x) => x.goals);
  const setGoals = useCosmos((x) => x.setGoals);
  const progress = useCosmos((x) => x.progress);
  const num = (n: number) => new Intl.NumberFormat(lang).format(n);
  const today = wordsOn(progress, dayKey(new Date()));
  const days = streak(progress, new Date());
  const hours = Math.floor(stats.minutes / 60);
  const reading = hours > 0 ? fmt(s.hours, { h: hours, m: String(stats.minutes % 60).padStart(2, "0") }) : fmt(s.minutes, { m: Math.max(stats.words > 0 ? 1 : 0, stats.minutes) });
  const bar = (value: number, goal: number | undefined, label: string) =>
    goal ? <progress className="ms-progress" max={goal} value={Math.min(value, goal)} aria-label={label} /> : null;
  const goalInput = (key: "daily" | "total", label: string) => (
    <label className="ms-goal">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        step={key === "daily" ? 100 : 1000}
        inputMode="numeric"
        value={goals[key] ?? ""}
        placeholder={s.goalPlaceholder}
        onChange={(e) => setGoals({ ...goals, [key]: Number(e.target.value) || undefined })}
      />
    </label>
  );

  return (
    <section className="sp-box ms-stats" aria-label={s.title}>
      <h2 className="sp-box-title">{s.title}</h2>
      <dl>
        <div>
          <dt>{s.words}</dt>
          <dd>{num(stats.words)}</dd>
        </div>
        <div>
          <dt>{s.pages}</dt>
          <dd>≈ {num(stats.pages)}</dd>
        </div>
        <div>
          <dt>{s.reading}</dt>
          <dd>≈ {reading}</dd>
        </div>
        <div>
          <dt>{s.scenes}</dt>
          <dd>{fmt(s.of, { n: num(stats.written), total: num(stats.scenes) })}</dd>
        </div>
        {chapters > 0 && (
          <div>
            <dt>{s.chapters}</dt>
            <dd>{num(chapters)}</dd>
          </div>
        )}
        <div>
          <dt>{s.average}</dt>
          <dd>{num(stats.average)}</dd>
        </div>
        <div>
          <dt>{s.thisScene}</dt>
          <dd>{fmt(s.sceneValue, { n: num(sceneWords), pages: num(pagesFor(sceneWords)) })}</dd>
        </div>
      </dl>
      <div className="ms-goals">
        <p className="ms-today">
          <strong>{fmt(s.today, { n: num(today) })}</strong>
          {goals.daily ? ` · ${fmt(s.dailyProgress, { pct: Math.min(100, Math.round((today / goals.daily) * 100)), goal: num(goals.daily) })}` : ""}
          {days > 1 ? ` · ${fmt(s.streak, { n: days })}` : ""}
        </p>
        {bar(today, goals.daily, s.dailyGoal)}
        {goals.total ? (
          <p className="ms-today">{fmt(s.bookProgress, { n: num(stats.words), total: num(goals.total), pct: Math.min(100, Math.round((stats.words / goals.total) * 100)) })}</p>
        ) : null}
        {bar(stats.words, goals.total, s.bookGoal)}
        <div className="ms-goal-inputs">
          {goalInput("daily", s.dailyGoal)}
          {goalInput("total", s.bookGoal)}
        </div>
        <p className="sp-empty">{fmt(s.estimate, { n: WORDS_PER_PAGE })}</p>
      </div>
    </section>
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
