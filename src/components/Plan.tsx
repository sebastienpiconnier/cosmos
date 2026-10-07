// Plan (vue Plan d'un projet roman) : les cartes Scène rangées dans les cases d'un gabarit
// (trois actes, Save the Cat, voyage du héros) ou dans une liste libre. Rien n'est recopié :
// le plan ne retient que l'ordre, le titre et le texte restent ceux de la carte.
// Trois chemins pour ranger une scène : la glisser, les flèches, ou le menu « Ranger dans ».

import { useEffect, useMemo, useRef, useState } from "react";
import { useCosmos, planScenes } from "../store";
import { useSettings } from "../settings";
import { fmt, useT } from "../i18n";
import { PLAN_TEMPLATE_KEYS, arrange, isPlanTemplate, type PlanBeat } from "../plan";
import { plainText } from "../search";

/** Valeur du menu « Ranger dans » pour une scène sortie du plan. */
const UNPLACED = "";

export function Plan() {
  const t = useT();
  const p = t.plan;
  const lang = useSettings((s) => s.lang);
  const nodes = useCosmos((s) => s.nodes);
  const plan = useCosmos((s) => s.plan);
  const setPlanTemplate = useCosmos((s) => s.setPlanTemplate);
  const placeInPlan = useCosmos((s) => s.placeInPlan);
  const stepInPlan = useCosmos((s) => s.stepInPlan);
  const addPlanScene = useCosmos((s) => s.addPlanScene);
  const updateCard = useCosmos((s) => s.updateCard);
  const revealCard = useCosmos((s) => s.revealCard);

  const sceneIds = useMemo(() => planScenes(nodes), [nodes]);
  const arranged = useMemo(() => arrange(plan, sceneIds), [plan, sceneIds]);
  const cards = useMemo(() => new Map(nodes.map((n) => [n.id, n.data])), [nodes]);
  const free = plan.template === "libre";
  const placed = sceneIds.length - arranged.unplaced.length;

  // Scène en cours de glissement : la ref sert au dépôt (lu tout de suite), l'état à l'affichage.
  const draggedRef = useRef<string | null>(null);
  const [dragged, setDraggedState] = useState<string | null>(null);
  const setDragged = (id: string | null) => {
    draggedRef.current = id;
    setDraggedState(id);
  };
  const [over, setOver] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Après un déplacement au clavier, le focus suit la scène.
  const rootRef = useRef<HTMLDivElement>(null);
  const refocus = useRef<{ id: string; way: "up" | "down" } | null>(null);
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const row = rootRef.current?.querySelector(`[data-scene="${target.id}"]`);
    const button =
      row?.querySelector<HTMLButtonElement>(`button[data-move="${target.way}"]:not(:disabled)`) ??
      row?.querySelector<HTMLButtonElement>("button[data-move]:not(:disabled)");
    button?.focus();
  }, [plan]);

  const beatLabel = (key: string) => p.beats[key as PlanBeat].label;
  const titleOf = (id: string) => cards.get(id)?.title.trim() || p.untitled;

  /** Annonce la nouvelle place d'une scène (lecteurs d'écran), d'après l'état à jour du store. */
  const tell = (id: string) => {
    const now = arrange(useCosmos.getState().plan, sceneIds);
    const beat = now.beats.find((b) => b.ids.includes(id));
    setAnnounce(
      beat
        ? fmt(p.moved, { title: titleOf(id), beat: beatLabel(beat.key), n: beat.ids.indexOf(id) + 1 })
        : fmt(p.removed, { title: titleOf(id) }),
    );
  };
  const place = (id: string, beat: string | null, index?: number) => {
    placeInPlan(id, beat, index);
    tell(id);
  };
  const step = (id: string, way: "up" | "down") => {
    if (!stepInPlan(id, way)) return;
    refocus.current = { id, way };
    tell(id);
  };
  const add = (beat: string) => {
    const title = (drafts[beat] ?? "").trim();
    if (!title) return;
    addPlanScene(title, beat);
    setDrafts({ ...drafts, [beat]: "" });
  };

  const order = arranged.beats.flatMap((b) => b.ids);
  const plural = (n: number) => fmt(new Intl.PluralRules(lang).select(n) === "one" ? p.summaryOne : p.summaryMany, { n });

  const dropOn = (key: string, beat: string | null, index?: number) => ({
    onDragOver: (e: React.DragEvent) => {
      if (draggedRef.current === null) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(key);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedRef.current !== null) place(draggedRef.current, beat, index);
      setDragged(null);
      setOver(null);
    },
  });

  const scene = (id: string, beat: string | null, index: number) => {
    const card = cards.get(id);
    if (!card) return null;
    const title = titleOf(id);
    const text = card.html ? plainText(card.html) : "";
    const at = order.indexOf(id);
    return (
      <li
        key={id}
        data-scene={id}
        className={`sq-scene plan-scene${dragged === id ? " is-dragged" : ""}${over === id && dragged !== id ? " is-over" : ""}`}
        draggable
        onDragStart={(e) => {
          // Pas en tirant dans un champ : on y sélectionne du texte.
          if ((e.target as HTMLElement).closest("input, select")) return e.preventDefault();
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", title);
          setDragged(id);
        }}
        onDragEnd={() => {
          setDragged(null);
          setOver(null);
        }}
        // Déposer sur une scène rangée : juste avant elle. Sur une scène à placer : on sort du plan.
        {...dropOn(id, beat, beat === null ? undefined : index)}
      >
        {beat !== null && (
          <div className="sq-moves">
            <button type="button" className="icon-button" data-move="up" disabled={at <= 0} aria-label={fmt(p.moveUp, { title })} onClick={() => step(id, "up")}>
              <span aria-hidden="true">↑</span>
            </button>
            <button
              type="button"
              className="icon-button"
              data-move="down"
              disabled={at === order.length - 1}
              aria-label={fmt(p.moveDown, { title })}
              onClick={() => step(id, "down")}
            >
              <span aria-hidden="true">↓</span>
            </button>
          </div>
        )}
        <div className="sq-body">
          <input
            className="bible-title"
            value={card.title}
            placeholder={p.untitled}
            aria-label={p.sceneTitle}
            onChange={(e) => updateCard(id, { title: e.target.value })}
          />
          {text && <p className="sq-desc">{text.length > 160 ? `${text.slice(0, 160)}…` : text}</p>}
        </div>
        {!free && (
          <label className="plan-to">
            <span className="sr-only">{fmt(p.moveTo, { title })}</span>
            <span aria-hidden="true">{p.moveToShort}</span>
            <select value={beat ?? UNPLACED} onChange={(e) => place(id, e.target.value === UNPLACED ? null : e.target.value)}>
              <option value={UNPLACED}>{p.unplaced}</option>
              {arranged.beats.map((b) => (
                <option key={b.key} value={b.key}>
                  {beatLabel(b.key)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="icon-button" aria-label={fmt(p.show, { title })} title={fmt(p.show, { title })} onClick={() => revealCard(id)}>
          <span aria-hidden="true">↗</span>
        </button>
      </li>
    );
  };

  return (
    <div className="sequencer" ref={rootRef}>
      <div className="sq-inner">
        <header className="sq-head">
          <h1>{p.title}</h1>
          <label className="plan-template">
            {p.template}
            <select value={plan.template} onChange={(e) => isPlanTemplate(e.target.value) && setPlanTemplate(e.target.value)}>
              {PLAN_TEMPLATE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {p.templates[key]}
                </option>
              ))}
            </select>
          </label>
          {sceneIds.length > 0 && (
            <p className="sq-total">
              <strong>{plural(sceneIds.length)}</strong>
              {!free && <> · {fmt(p.placedOf, { placed, n: sceneIds.length })}</>}
            </p>
          )}
        </header>
        <p className="sp-empty">{sceneIds.length === 0 ? p.empty : p.hint}</p>

        {arranged.beats.map((beat) => (
          <section key={beat.key} className={`plan-beat${over === beat.key ? " is-over" : ""}`} aria-labelledby={`plan-${beat.key}`} {...dropOn(beat.key, beat.key)}>
            <h2 id={`plan-${beat.key}`}>
              {beatLabel(beat.key)}
              {beat.ids.length > 0 && <span className="plan-count">{beat.ids.length}</span>}
            </h2>
            <p className="plan-beat-hint">{p.beats[beat.key as PlanBeat].hint}</p>
            {beat.ids.length > 0 && <ol className="sq-list">{beat.ids.map((id, i) => scene(id, beat.key, i))}</ol>}
            <form
              className="plan-add"
              onSubmit={(e) => {
                e.preventDefault();
                add(beat.key);
              }}
            >
              <input
                value={drafts[beat.key] ?? ""}
                placeholder={p.newScene}
                aria-label={fmt(p.newSceneIn, { beat: beatLabel(beat.key) })}
                onChange={(e) => setDrafts({ ...drafts, [beat.key]: e.target.value })}
              />
              <button type="submit" disabled={!(drafts[beat.key] ?? "").trim()}>
                {p.add}
              </button>
            </form>
          </section>
        ))}

        {!free && (
          <section className={`plan-beat is-unplaced${over === "unplaced" ? " is-over" : ""}`} aria-labelledby="plan-unplaced" {...dropOn("unplaced", null)}>
            <h2 id="plan-unplaced">
              {p.unplaced}
              {arranged.unplaced.length > 0 && <span className="plan-count">{arranged.unplaced.length}</span>}
            </h2>
            <p className="plan-beat-hint">{arranged.unplaced.length > 0 || sceneIds.length === 0 ? p.unplacedHint : p.unplacedEmpty}</p>
            {arranged.unplaced.length > 0 && <ol className="sq-list">{arranged.unplaced.map((id, i) => scene(id, null, i))}</ol>}
          </section>
        )}

        <div className="sr-only" aria-live="polite">
          {announce}
        </div>
      </div>
    </div>
  );
}
