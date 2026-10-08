// Assistant personnage, dans la fiche d'un personnage de la Bible : une question à la fois.
// L'auteur répond (la réponse s'ajoute à la fiche), passe à une autre question, ou range la
// question pour plus tard (« Je ne sais pas encore » crée une carte Question reliée au personnage).
// Si un service d'IA est branché, un quatrième niveau pose des questions sur mesure d'après la fiche :
// l'IA pose la question, elle ne répond jamais.

import { useId, useMemo, useRef, useState } from "react";
import { useCosmos } from "../store";
import { aiConfig, useSettings } from "../settings";
import { fmt, useT } from "../i18n";
import type { CardData } from "../types";
import { ASSISTANT_LEVELS, levelQuestions, nextOpen, type AssistantLevel } from "../assistant";
import { AiError, complete, isReady } from "../ai/providers";
import { interviewPrompt, parseQuestion } from "../ai/tasks";

type Level = AssistantLevel | "custom";

export function CharacterAssistant({ card }: { card: CardData }) {
  const all = useT();
  const t = all.assistant;
  const nodes = useCosmos((s) => s.nodes);
  const edges = useCosmos((s) => s.edges);
  const answerQuestion = useCosmos((s) => s.answerQuestion);
  const parkQuestion = useCosmos((s) => s.parkQuestion);
  const aiSettings = useSettings((s) => s.ai);
  const config = useMemo(() => aiConfig(aiSettings), [aiSettings]);
  const lang = useSettings((s) => s.lang);
  const ai = isReady(config);

  const [open, setOpen] = useState(false);
  const [chosen, setLevel] = useState<Level>("essentiel");
  const level: Level = chosen === "custom" && !ai ? "essentiel" : chosen;
  // Question affichée : on la garde tant qu'elle est ouverte, sinon on passe à la suivante.
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [said, setSaid] = useState("");
  // Question sur mesure, posée par l'IA.
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const asked = useRef<string[]>([]);
  const panelId = useId();

  const cards = useMemo(() => nodes.map((n) => n.data), [nodes]);
  const byLevel = useMemo(
    () => Object.fromEntries(ASSISTANT_LEVELS.map((l) => [l, levelQuestions(l, t.questions, card, cards, edges)])) as Record<AssistantLevel, ReturnType<typeof levelQuestions>>,
    [t, card, cards, edges],
  );
  const questions = level === "custom" ? [] : byLevel[level];
  const fromBank = level === "custom" ? null : (questions.find((q) => q.key === shownKey && q.state === "open") ?? nextOpen(questions, null));
  const question = level === "custom" ? custom : (fromBank?.text ?? "");
  const name = card.title.trim();
  const done = (l: AssistantLevel) => byLevel[l].filter((q) => q.state !== "open").length;

  const pickLevel = (l: Level) => {
    setLevel(l);
    setShownKey(null);
    setAnswer("");
    setError("");
  };

  /** Demande à l'IA une question d'après la fiche et les cartes reliées. */
  const ask = async () => {
    if (!isReady(config) || busy) return;
    setBusy(true);
    setError("");
    try {
      const { nodes: now, edges: links } = useCosmos.getState();
      const data = now.map((n) => n.data);
      const self = data.find((c) => c.id === card.id) ?? card;
      const prompt = interviewPrompt(self, data, links.map((e) => ({ source: e.source, target: e.target, label: String(e.label ?? "") })), lang, asked.current);
      const next = parseQuestion(await complete(config, prompt.system, prompt.user, 200));
      if (!next) throw new AiError("empty");
      asked.current.push(next);
      setCustom(next);
      setAnswer("");
    } catch (err) {
      console.error(err);
      setError(all.ai.errors[err instanceof AiError ? err.code : "other"]);
    } finally {
      setBusy(false);
    }
  };

  const advance = () => {
    setAnswer("");
    if (level === "custom") void ask();
    else setShownKey(nextOpen(questions, fromBank?.key ?? null)?.key ?? null);
  };
  const save = () => {
    if (!question || !answer.trim()) return;
    answerQuestion(card.id, question, answer);
    setSaid(t.added);
    if (level === "custom") {
      setCustom("");
      setAnswer("");
    } else advance();
  };
  const park = () => {
    if (!question) return;
    parkQuestion(card.id, question);
    setSaid(t.parked);
    if (level === "custom") {
      setCustom("");
      setAnswer("");
    } else advance();
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
            {ai && (
              <button type="button" aria-pressed={level === "custom"} onClick={() => pickLevel("custom")}>
                {t.custom}
              </button>
            )}
          </div>
          <p className="assistant-hint">{level === "custom" ? t.customHint : t.levelHints[level]}</p>

          {question ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label className="assistant-question" htmlFor={`${panelId}-answer`}>
                {question}
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
                <button type="button" onClick={advance} disabled={busy || (level !== "custom" && questions.filter((q) => q.state === "open").length < 2)}>
                  {busy ? all.ai.working : t.another}
                </button>
              </div>
            </form>
          ) : level === "custom" ? (
            <div className="assistant-actions">
              <button type="button" className="is-primary" disabled={busy} onClick={() => void ask()}>
                {busy ? all.ai.working : t.ask}
              </button>
            </div>
          ) : (
            <p className="assistant-done">{t.levelDone}</p>
          )}
          {error && (
            <p className="ai-error" role="alert">
              {error}
            </p>
          )}
          <div className="sr-only" aria-live="polite">
            {said}
          </div>
        </div>
      )}
    </div>
  );
}
