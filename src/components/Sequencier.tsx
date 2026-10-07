// Séquencier minimal (vue Plan d'un projet scénario) : les scènes dans l'ordre du fichier, avec leur
// longueur. Changer l'ordre ici déplace la scène entière dans scenario.fountain.
// Trois chemins : glisser à la souris, boutons Monter et Descendre au doigt et au clavier.

import { useEffect, useMemo, useRef, useState } from "react";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { fmt } from "../i18n";
import { useVocab } from "../vocab";
import { blocks, moveBlock } from "../screenplay/sequence";
import { pagesBetween } from "../screenplay/paginate";
import { minutesFor, usePagination } from "./usePagination";

/** Début du texte d'une carte, sans balises. */
function excerpt(html: string): string {
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

export function Sequencier() {
  const { t } = useVocab();
  const sp = t.screenplay;
  const sq = sp.sequencer;
  const lang = useSettings((s) => s.lang);
  const screenplay = useCosmos((s) => s.screenplay);
  const nodes = useCosmos((s) => s.nodes);
  const setScreenplay = useCosmos((s) => s.setScreenplay);
  const pagination = usePagination();

  const list = useMemo(() => (screenplay ? blocks(screenplay.elements) : []), [screenplay]);
  // Scène en cours de glissement : la ref sert au dépôt (lu tout de suite), l'état à l'affichage.
  const draggedRef = useRef<number | null>(null);
  const [dragged, setDraggedState] = useState<number | null>(null);
  const setDragged = (index: number | null) => {
    draggedRef.current = index;
    setDraggedState(index);
  };
  const [over, setOver] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  // Après un déplacement au clavier, le focus suit la scène.
  const listRef = useRef<HTMLOListElement>(null);
  const refocus = useRef<{ index: number; way: "up" | "down" } | null>(null);
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const row = listRef.current?.children[target.index];
    const button =
      row?.querySelector<HTMLButtonElement>(`button[data-move="${target.way}"]:not(:disabled)`) ??
      row?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    button?.focus();
  }, [list]);

  if (!screenplay || !pagination) return null;

  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  const plural = (n: number, one: string, many: string) =>
    fmt(new Intl.PluralRules(lang).select(n) === "one" ? one : many, { n });

  const move = (from: number, to: number, way?: "up" | "down") => {
    const elements = moveBlock(screenplay.elements, from, to);
    if (elements === screenplay.elements) return;
    if (way) refocus.current = { index: to, way };
    const moved = blocks(elements)[to];
    setAnnounce(fmt(sq.moved, { title: moved.text || sp.untitledScene, n: moved.number ?? 0 }));
    setScreenplay({ ...screenplay, elements }, true);
  };

  const scenes = list.filter((b) => b.kind === "scene").length;

  return (
    <div className="sequencer">
      <div className="sq-inner">
        <header className="sq-head">
          <h1>{sq.title}</h1>
          {pagination.pages > 0 && (
            <p className="sq-total">
              <strong>{fmt(sp.minutes, { n: minutesFor(pagination.pages) })}</strong> ·{" "}
              {plural(pagination.pages, sp.pagesOne, sp.pagesMany)}
            </p>
          )}
        </header>
        {scenes === 0 ? <p className="sp-empty">{sq.empty}</p> : scenes > 1 && <p className="sp-empty">{sq.hint}</p>}

        <ol className="sq-list" ref={listRef} aria-label={sq.listAria}>
          {list.map((block, i) => {
            const dropClass = over === i && dragged !== null && dragged !== i ? " is-over" : "";
            const drop = {
              onDragOver: (e: React.DragEvent) => {
                if (draggedRef.current === null) return;
                e.preventDefault();
                setOver(i);
              },
              onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                if (draggedRef.current !== null) move(draggedRef.current, i);
                setDragged(null);
                setOver(null);
              },
            };

            if (block.kind === "section") {
              return (
                <li key={`section-${block.start}`} className={`sq-section${dropClass}`} {...drop}>
                  {block.text}
                </li>
              );
            }

            const title = block.text || sp.untitledScene;
            const card = block.cardId ? nodes.find((n) => n.id === block.cardId)?.data : undefined;
            const description = card?.html ? excerpt(card.html) : "";
            const pages = pagesBetween(pagination, block.start, block.end);
            return (
              <li
                key={`scene-${block.start}`}
                className={`sq-scene${dragged === i ? " is-dragged" : ""}${dropClass}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", title);
                  setDragged(i);
                }}
                onDragEnd={() => {
                  setDragged(null);
                  setOver(null);
                }}
                {...drop}
              >
                <div className="sq-moves">
                  <button
                    type="button"
                    className="icon-button"
                    data-move="up"
                    disabled={i === 0}
                    aria-label={fmt(sq.moveUp, { title })}
                    onClick={() => move(i, i - 1, "up")}
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    data-move="down"
                    disabled={i === list.length - 1}
                    aria-label={fmt(sq.moveDown, { title })}
                    onClick={() => move(i, i + 1, "down")}
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </div>
                <div className="sq-body">
                  <div className="is-slugline sq-title">
                    {block.number}. {title}
                  </div>
                  {description && <p className="sq-desc">{description}</p>}
                </div>
                <div className="sq-length">
                  <div>{fmt(sp.lengthShort, { n: number.format(pages) })}</div>
                  {/* Sous la demi-page, une durée arrondie à la minute ne voudrait rien dire. */}
                  {pages >= 0.5 && <div>{fmt(sp.minutes, { n: minutesFor(pages) })}</div>}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="sr-only" aria-live="polite">
          {announce}
        </div>
      </div>
    </div>
  );
}
