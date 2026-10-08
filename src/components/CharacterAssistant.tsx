// Assistant personnage, dans la fiche d'un personnage de la Bible. Deux façons de creuser :
// - des questions, une à la fois, par niveau (essentiel, approfondi, intime). L'auteur répond (la réponse
//   s'ajoute à la fiche), passe à une autre, ou la garde pour plus tard (« Je ne sais pas encore » :
//   elle reste dans la carte du personnage, onglet « À creuser », sans rien poser sur le canevas) ;
// - si un service d'IA est branché : une question sur mesure d'après la fiche, et une synthèse qui
//   remet en ordre ce que l'auteur a déjà écrit (fiche, notes, réponses). La synthèse est proposée :
//   l'auteur l'ajoute à la fiche ou l'ignore. L'IA n'invente rien et ne répond jamais à sa place.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCosmos } from "../store";
import { aiConfig, useSettings } from "../settings";
import { fmt, useT } from "../i18n";
import type { CardData } from "../types";
import { ASSISTANT_LEVELS, levelQuestions, nextOpen, type AssistantLevel } from "../assistant";
import { AiError, complete, isReady } from "../ai/providers";
import { interviewPrompt, parseQuestion, parseSynthesis, synthesisPrompt } from "../ai/tasks";

type Tab = AssistantLevel | "custom" | "pending";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function CharacterAssistant({ card, startOpen = false }: { card: CardData; startOpen?: boolean }) {
  const all = useT();
  const t = all.assistant;
  const ct = all.character;
  const nodes = useCosmos((s) => s.nodes);
  const edges = useCosmos((s) => s.edges);
  const answerQuestion = useCosmos((s) => s.answerQuestion);
  const parkQuestion = useCosmos((s) => s.parkQuestion);
  const dropQuestion = useCosmos((s) => s.dropQuestion);
  const updateCard = useCosmos((s) => s.updateCard);
  const aiSettings = useSettings((s) => s.ai);
  const config = useMemo(() => aiConfig(aiSettings), [aiSettings]);
  const lang = useSettings((s) => s.lang);
  const ai = isReady(config);
  const pending = card.questions ?? [];

  const [open, setOpen] = useState(startOpen);
  const [chosen, setTab] = useState<Tab>(startOpen && pending.length > 0 ? "pending" : "essentiel");
  const tab: Tab = chosen === "custom" && !ai ? "essentiel" : chosen;
  useEffect(() => {
    if (!startOpen) return;
    setOpen(true);
    if ((card.questions ?? []).length > 0) setTab("pending");
  }, [startOpen, card.questions]);

  // Question affichée : on la garde tant qu'elle est ouverte, sinon on passe à la suivante.
  const [shownKey, setShownKey] = useState<string | null>(null);
  // Question en attente qu'on a choisi de traiter (onglet « À creuser »).
  const [pendingShown, setPendingShown] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [said, setSaid] = useState("");
  // Question sur mesure, posée par l'IA.
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState<"" | "ask" | "synthesis">("");
  const [error, setError] = useState("");
  const [synthesis, setSynthesis] = useState<string[] | null>(null);
  const asked = useRef<string[]>([]);
  const panelId = useId();

  const cards = useMemo(() => nodes.map((n) => n.data), [nodes]);
  const byLevel = useMemo(
    () => Object.fromEntries(ASSISTANT_LEVELS.map((l) => [l, levelQuestions(l, t.questions, card, cards, edges)])) as Record<AssistantLevel, ReturnType<typeof levelQuestions>>,
    [t, card, cards, edges],
  );
  const isLevel = tab !== "custom" && tab !== "pending";
  const questions = isLevel ? byLevel[tab] : [];
  const fromBank = isLevel ? (questions.find((q) => q.key === shownKey && q.state === "open") ?? nextOpen(questions, null)) : null;
  const question = tab === "custom" ? custom : tab === "pending" ? (pendingShown && pending.includes(pendingShown) ? pendingShown : "") : (fromBank?.text ?? "");
  const name = card.title.trim();
  const done = (l: AssistantLevel) => byLevel[l].filter((q) => q.state !== "open").length;

  const pickTab = (next: Tab) => {
    setTab(next);
    setShownKey(null);
    setPendingShown(null);
    setAnswer("");
    setError("");
  };

  const linksNow = () => useCosmos.getState().edges.map((e) => ({ source: e.source, target: e.target, label: String(e.label ?? "") }));
  const selfNow = () => {
    const data = useCosmos.getState().nodes.map((n) => n.data);
    return { data, self: data.find((c) => c.id === card.id) ?? card };
  };

  /** Demande à l'IA une question d'après la fiche et les cartes reliées. */
  const ask = async () => {
    if (!isReady(config) || busy) return;
    setBusy("ask");
    setError("");
    try {
      const { data, self } = selfNow();
      const prompt = interviewPrompt(self, data, linksNow(), lang, asked.current);
      const next = parseQuestion(await complete(config, prompt.system, prompt.user, 400));
      if (!next) throw new AiError("empty");
      asked.current.push(next);
      setCustom(next);
      setAnswer("");
    } catch (err) {
      console.error(err);
      setError(all.ai.errors[err instanceof AiError ? err.code : "other"]);
    } finally {
      setBusy("");
    }
  };

  /** Demande une synthèse de ce qui est écrit sur ce personnage. */
  const synthesize = async () => {
    if (!isReady(config) || busy) return;
    setBusy("synthesis");
    setError("");
    setSynthesis(null);
    try {
      const { data, self } = selfNow();
      const prompt = synthesisPrompt(self, data, linksNow(), lang, ct.fields);
      const paragraphs = parseSynthesis(await complete(config, prompt.system, prompt.user, 1200));
      if (paragraphs.length === 0) throw new AiError("empty");
      setSynthesis(paragraphs);
    } catch (err) {
      console.error(err);
      setError(all.ai.errors[err instanceof AiError ? err.code : "other"]);
    } finally {
      setBusy("");
    }
  };

  const keepSynthesis = () => {
    if (!synthesis) return;
    const current = useCosmos.getState().nodes.find((n) => n.id === card.id)?.data.html ?? "";
    const added = `<h3>${escape(ct.synthesisHeading)}</h3>${synthesis.map((p) => `<p>${escape(p)}</p>`).join("")}`;
    updateCard(card.id, { html: `${current === "<p></p>" ? "" : current}${added}` });
    setSynthesis(null);
    setSaid(ct.synthesisAdded);
  };

  const advance = () => {
    setAnswer("");
    if (tab === "custom") void ask();
    else if (tab === "pending") setPendingShown(null);
    else setShownKey(nextOpen(questions, fromBank?.key ?? null)?.key ?? null);
  };
  const save = () => {
    if (!question || !answer.trim()) return;
    answerQuestion(card.id, question, answer);
    setSaid(t.added);
    if (tab === "custom") {
      setCustom("");
      setAnswer("");
    } else advance();
  };
  const park = () => {
    if (!question) return;
    parkQuestion(card.id, question);
    setSaid(t.parked);
    if (tab === "custom") {
      setCustom("");
      setAnswer("");
    } else advance();
  };

  const answering = question ? (
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
        {tab !== "pending" && (
          <button type="button" onClick={park}>
            {t.dontKnow}
          </button>
        )}
        <button
          type="button"
          onClick={advance}
          disabled={busy !== "" || (isLevel && questions.filter((q) => q.state === "open").length < 2)}
        >
          {busy === "ask" ? all.ai.working : tab === "pending" ? ct.backToList : t.another}
        </button>
      </div>
    </form>
  ) : null;

  return (
    <div className="assistant">
      <div className="assistant-bar">
        <button type="button" className="ghost-button assistant-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          {name ? fmt(t.open, { name }) : t.openUnnamed}
        </button>
        {ai && (
          <button type="button" className="ghost-button assistant-toggle" disabled={busy !== ""} title={ct.synthesisHint} onClick={() => void synthesize()}>
            {busy === "synthesis" ? all.ai.working : ct.synthesis}
          </button>
        )}
      </div>

      {synthesis && (
        <div className="assistant-panel synthesis" role="group" aria-label={ct.synthesis}>
          <p className="assistant-hint">{ct.synthesisProposal}</p>
          <div className="synthesis-text">
            {synthesis.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="assistant-actions">
            <button type="button" className="is-primary" onClick={keepSynthesis}>
              {ct.synthesisKeep}
            </button>
            <button type="button" onClick={() => setSynthesis(null)}>
              {all.ai.ignore}
            </button>
          </div>
        </div>
      )}

      {open && (
        <div id={panelId} className="assistant-panel">
          <div className="sq-modes" role="group" aria-label={t.levelAria}>
            {ASSISTANT_LEVELS.map((l) => (
              <button key={l} type="button" aria-pressed={tab === l} onClick={() => pickTab(l)}>
                {t.levels[l]} <span className="assistant-count">{fmt(t.progress, { done: done(l), total: byLevel[l].length })}</span>
              </button>
            ))}
            {ai && (
              <button type="button" aria-pressed={tab === "custom"} onClick={() => pickTab("custom")}>
                {t.custom}
              </button>
            )}
            <button type="button" aria-pressed={tab === "pending"} onClick={() => pickTab("pending")}>
              {ct.pendingTab} <span className="assistant-count">{pending.length}</span>
            </button>
          </div>
          <p className="assistant-hint">{tab === "custom" ? t.customHint : tab === "pending" ? ct.pendingHint : t.levelHints[tab]}</p>

          {tab === "pending" && !question ? (
            pending.length === 0 ? (
              <p className="assistant-done">{ct.pendingEmpty}</p>
            ) : (
              <ul className="pending-list">
                {pending.map((q) => (
                  <li key={q}>
                    <span>{q}</span>
                    <div className="assistant-actions">
                      <button type="button" className="is-primary" onClick={() => setPendingShown(q)}>
                        {ct.answer}
                      </button>
                      <button type="button" aria-label={fmt(ct.dropAria, { question: q })} onClick={() => dropQuestion(card.id, q)}>
                        {ct.drop}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : question ? (
            answering
          ) : tab === "custom" ? (
            <div className="assistant-actions">
              <button type="button" className="is-primary" disabled={busy !== ""} onClick={() => void ask()}>
                {busy === "ask" ? all.ai.working : t.ask}
              </button>
            </div>
          ) : (
            <p className="assistant-done">{t.levelDone}</p>
          )}
        </div>
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
  );
}
