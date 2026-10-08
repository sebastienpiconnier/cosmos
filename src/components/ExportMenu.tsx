// Bouton « Exporter » : le scénario (PDF au format standard, Fountain, Final Draft) ou le manuscrit
// d'un roman (PDF, Word, EPUB, Markdown), et la bible du projet dans les deux cas.
// Menu de vrais boutons : souris, doigt et clavier (Échap referme, le focus revient sur le bouton).

import { useEffect, useId, useRef, useState } from "react";
import { fmt, useT } from "../i18n";
import { useVocab } from "../vocab";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { SCREENPLAY_FILE, storage } from "../storage";
import { CARD_TYPES } from "../types";
import { chapterNumbers, chapterOf } from "../plan";
import { bookOrder, isPageKind } from "../book";
import { EXPORT_FORMATS, exportScreenplay, type ExportFormat, type ExportedFile } from "../screenplay/export";
import { BIBLE_FORMATS, MANUSCRIPT_FORMATS, exportDocument, type DocFormat } from "../export";
import { bibleDoc, manuscriptDoc } from "../export/doc";

export function ExportMenu() {
  const { t: all, types, kind } = useVocab();
  const t = all.screenplay.export;
  const x = useT().exports;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  /** Fabrique le fichier, puis le fait enregistrer par le système. */
  const run = async (label: string, build: () => Promise<ExportedFile | null>) => {
    if (busy) return;
    setBusy(true);
    setMessage(t.working);
    try {
      const file = await build();
      if (!file) {
        setMessage(x.emptyManuscript);
        return;
      }
      const saved = await storage.saveAs(file, label);
      setMessage(saved ? t.done : "");
      if (saved) setOpen(false);
    } catch (err) {
      console.error(err);
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const info = () => {
    const { title } = useCosmos.getState();
    const { lang, author } = useSettings.getState();
    return { title: title.trim() || all.home.untitled, author: author.trim(), lang };
  };

  const screenplayFile = (format: ExportFormat) => async () => {
    const { screenplay, savedScreenplay, lastFiles, title, paper, sceneNumbers } = useCosmos.getState();
    if (!screenplay) return null;
    return exportScreenplay(screenplay, format, {
      title,
      paper,
      locale: useSettings.getState().lang,
      strings: { more: all.screenplay.more, contd: all.screenplay.contd },
      numberScenes: sceneNumbers,
      // Scénario inchangé depuis le disque : on exporte le fichier lui-même, à l'octet près.
      source: screenplay === savedScreenplay ? lastFiles[SCREENPLAY_FILE] : undefined,
    });
  };

  const manuscriptFile = (format: DocFormat) => async () => {
    const { nodes, plan, manuscript, paper } = useCosmos.getState();
    const cards = nodes.map((n) => n.data);
    const order = bookOrder(nodes, plan);
    const numbers = chapterNumbers(plan, order);
    const doc = manuscriptDoc(info(), order, cards, manuscript, all.manuscript.untitled, (id) => {
      // Page du livre (dédicace, prologue…) : un chapitre à elle seule, sous son nom.
      const page = cards.find((c) => c.id === id)?.page;
      if (isPageKind(page)) return { id: `page:${id}`, title: all.book.kinds[page] };
      const chapter = chapterOf(plan, id);
      if (!chapter) return null;
      const n = numbers.get(chapter.id) ?? 0;
      return { id: chapter.id, title: chapter.title.trim() ? fmt(all.chapters.numberedTitle, { n, title: chapter.title.trim() }) : fmt(all.chapters.numbered, { n }) };
    });
    if (doc.chapters.length === 0) return null;
    return exportDocument(doc, format, { name: doc.title, paper, contents: x.contents });
  };

  const bibleFile = (format: DocFormat) => async () => {
    const { nodes, edges, paper } = useCosmos.getState();
    const sections = Object.fromEntries(CARD_TYPES.map((type) => [type, types[type].section])) as Record<(typeof CARD_TYPES)[number], string>;
    const base = info();
    const doc = bibleDoc(
      { ...base, title: fmt(x.bibleName, { title: base.title }) },
      nodes.map((n) => n.data),
      edges.map((e) => ({ source: e.source, target: e.target, label: String(e.label ?? "") })),
      { sections, untitled: all.bible.untitled, linkedTo: all.bible.linkedTo, fields: all.character.fields },
    );
    return exportDocument(doc, format, { name: doc.title, paper, contents: x.contents });
  };

  const groups = [
    kind === "scenario"
      ? { title: x.screenplay, items: EXPORT_FORMATS.map((f) => ({ key: `sp-${f}`, label: t[f], build: screenplayFile(f) })) }
      : { title: x.manuscript, items: MANUSCRIPT_FORMATS.map((f) => ({ key: `ms-${f}`, label: x[f], build: manuscriptFile(f) })) },
    { title: x.bible, items: BIBLE_FORMATS.map((f) => ({ key: `bible-${f}`, label: x[f], build: bibleFile(f) })) },
  ];
  const failed = message === t.failed || message === x.emptyManuscript;

  return (
    <div className="settings" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="ghost-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setMessage("");
          setOpen(!open);
        }}
      >
        {t.button}
      </button>
      {open && (
        <div className="settings-panel export-panel" id={panelId} role="group" aria-label={t.menuAria}>
          {groups.map((group) => (
            <div key={group.title} className="export-group" role="group" aria-label={group.title}>
              <span className="eyebrow">{group.title}</span>
              {group.items.map((item) => (
                <button key={item.key} type="button" className="ghost-button" disabled={busy} onClick={() => run(`${group.title}, ${item.label}`, item.build)}>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {/* Annoncé aux lecteurs d'écran ; visible seulement en cas d'échec. */}
      <span className={failed ? "export-error" : "sr-only"} role="status">
        {message}
      </span>
    </div>
  );
}
