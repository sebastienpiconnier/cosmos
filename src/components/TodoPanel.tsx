// Bouton « À faire » de la barre du haut : tout ce qui reste ouvert dans le projet (todos.ts), sans liste à
// part. Une case se coche d'ici ; une ligne mène à sa carte, à sa fiche ou à sa scène. Cmd/Ctrl+Maj+L.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCosmos } from "../store";
import { fmt, useT } from "../i18n";
import { collectTodos, type Todo, type TodoKind } from "../todos";
import { typeColor } from "../types";

const ORDER: TodoKind[] = ["task", "revisit", "question", "open"];

export function TodoPanel() {
  const t = useT();
  const d = t.todos;
  const nodes = useCosmos((s) => s.nodes);
  const manuscript = useCosmos((s) => s.manuscript);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const cards = useMemo(() => new Map(nodes.map((n) => [n.id, n.data])), [nodes]);
  const todos = useMemo(() => collectTodos([...cards.values()], manuscript), [cards, manuscript]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const go = (todo: Todo) => {
    setOpen(false);
    const s = useCosmos.getState();
    if (todo.where === "manuscript") s.openInManuscript(todo.cardId);
    else if (todo.kind === "question") s.openInBible(todo.cardId, true);
    else s.revealCard(todo.cardId);
  };
  const titleOf = (id: string) => cards.get(id)?.title.trim() || t.bible.untitled;

  return (
    <div className="settings" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button todo-button"
        aria-label={fmt(d.button, { n: todos.length })}
        title={fmt(d.button, { n: todos.length })}
        aria-expanded={open}
        aria-controls={panelId}
        aria-keyshortcuts="Control+Shift+L Meta+Shift+L"
        onClick={() => setOpen(!open)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
        </svg>
        {todos.length > 0 && <span className="todo-count" aria-hidden="true">{todos.length > 99 ? "99+" : todos.length}</span>}
      </button>
      {open && (
        <div className="settings-panel todo-panel" id={panelId} role="group" aria-label={d.title}>
          <div className="eyebrow">{d.title}</div>
          {todos.length === 0 && <p className="settings-hint">{d.empty}</p>}
          {ORDER.map((kind) => {
            const items = todos.filter((x) => x.kind === kind);
            if (items.length === 0) return null;
            return (
              <section key={kind} className="todo-group" aria-label={d.kinds[kind]}>
                <h3>
                  {d.kinds[kind]} <span className="toc-count">{items.length}</span>
                </h3>
                <ul>
                  {items.map((todo) => {
                    const card = cards.get(todo.cardId);
                    const where = fmt(todo.where === "manuscript" ? d.inScene : d.inCard, { title: titleOf(todo.cardId) });
                    return (
                      <li key={`${todo.kind}-${todo.where}-${todo.cardId}-${todo.index}`}>
                        {todo.kind === "task" && (
                          <input
                            type="checkbox"
                            aria-label={fmt(d.check, { text: todo.text })}
                            onChange={() => useCosmos.getState().toggleTodo(todo.cardId, todo.where, todo.index)}
                          />
                        )}
                        <button type="button" className="todo-item" onClick={() => go(todo)}>
                          <span className="todo-text">{todo.text}</span>
                          <span className="todo-where">
                            {card && <span className="card-dot" style={{ background: typeColor(card.type) }} />}
                            {where}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          <p className="settings-hint">{d.hint}</p>
        </div>
      )}
    </div>
  );
}
