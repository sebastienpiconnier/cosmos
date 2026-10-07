// Assistant personnage, dans la fiche d'un personnage de la Bible : une question à la fois.
// L'auteur répond (la réponse s'ajoute à la fiche), passe à une autre question, ou range la
// question pour plus tard (« Je ne sais pas encore » crée une carte Question reliée au personnage).

import { useId, useMemo, useState } from "react";
import { useCosmos } from "../store";
import { fmt, useT } from "../i18n";
import type { CardData } from "../types";
import { ASSISTANT_LEVELS, levelQuestions, nextOpen, type AssistantLevel } from "../assistant";

export function CharacterAssistant({ card }: { card: CardData }) {
  const t = useT().assistant;
  const nodes = useCosmos((s) => s.nodes);
  const edges = useCosmos((s) => s.edges);
  const answerQuestion = useCosmos((s) => s.answerQuestion);
  const parkQuestion = useCosmos((s) => s.parkQuestion);

  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<AssistantLevel>("essentiel");
  // Question affichée : on la garde tant qu'elle est ouverte, sinon on passe à la suivante.
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [said, setSaid] = useState("");
  const panelId = useId();

  const cards = useMemo(() => nodes.map((n) => n.data), [nodes]);
  const byLevel = useMemo(
    () => Object.fromEntries(ASSISTANT_LEVELS.map((l) => [l, levelQuestions(l, t.questions, card, cards, edges)])) as Record<AssistantLevel, ReturnType<typeof levelQuestions>>,
    [t, card, cards, edges],
  );
  const questions = byLevel[level];
  const current = questions.find((q) => q.key === shownKey && q.state === "open") ?? nextOpen(questions, null);
  const name = card.title.trim();
  const done = (l: AssistantLevel) => byLevel[l].filter((q) => q.state !== "open").length;

  const pickLevel = (l: AssistantLevel) => {
    setLevel(l);
    setShownKey(null);
    setAnswer("");
  };
  const advance = () => {
    setShownKey(nextOpen(questions, current?.key ?? null)?.key ?? null);
    setAnswer("");
  };
  const save = () => {
    if (!current || !answer.trim()) return;
    answerQuestion(card.id, current.text, answer);
    setSaid(t.added);
    advance();
  };
  const park = () => {
    if (!current) return;
    parkQuestion(card.id, current.text);
    setSaid(t.parked);
    advance();
  };

  return (
    <div className="assistant">
      <button type="button" className="ghost-button assistant-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        {name ? fmt(t.open, { name }) : t.openUnnamed}
      </button>
      {open && (
        <div id={panelId} className="assistant-panel">
          <div className="sq-modes" role="group" aria-label={t.levelAria}>
            {ASSISTANT_LEVELS.map((l) => (
              <button key={l} type="button" aria-pressed={level === l} onClick={() => pickLevel(l)}>
                {t.levels[l]} <span className="assistant-count">{fmt(t.progress, { done: done(l), total: byLevel[l].length })}</span>
              </button>
            ))}
          </div>
          <p className="assistant-hint">{t.levelHints[level]}</p>

          {current ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label className="assistant-question" htmlFor={`${panelId}-answer`}>
                {current.text}
              </label>
              <textarea
                id={`${panelId}-answer`}
                rows={3}
                value={answer}
                placeholder={t.placeholder}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    save();
                  }
                }}
              />
              <div className="assistant-actions">
                <button type="submit" className="is-primary" disabled={!answer.trim()}>
                  {t.add}
                </button>
                <button type="button" onClick={park}>
                  {t.dontKnow}
                </button>
                <button type="button" onClick={advance} disabled={questions.filter((q) => q.state === "open").length < 2}>
                  {t.another}
                </button>
              </div>
            </form>
          ) : (
            <p className="assistant-done">{t.levelDone}</p>
          )}
          <div className="sr-only" aria-live="polite">
            {said}
          </div>
        </div>
      )}
    </div>
  );
}
