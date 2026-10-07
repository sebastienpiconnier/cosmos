// La bible se construit toute seule à partir des cartes typées du canevas.
// Aucune donnée propre : c'est une autre lecture du même projet. On peut aussi y créer une fiche
// et la nommer : c'est une carte comme les autres, qui apparaît aussitôt sur le canevas.

import { useEffect, useMemo, useRef, useState } from "react";
import { useCosmos } from "../store";
import { typeColor, type CardType } from "../types";
import { fmt } from "../i18n";
import { useVocab } from "../vocab";
import { useSettings } from "../settings";

// Ordre de la bible : les personnages d'abord, les idées en vrac à la fin.
const ORDER: CardType[] = ["personnage", "lieu", "scene", "theme", "question", "idee"];

export function Bible() {
  const { t, types, kind } = useVocab();
  const lang = useSettings((s) => s.lang);
  const nodes = useCosmos((s) => s.nodes);
  const edges = useCosmos((s) => s.edges);
  const setView = useCosmos((s) => s.setView);
  const updateCard = useCosmos((s) => s.updateCard);
  const addTitledCard = useCosmos((s) => s.addTitledCard);

  // Fiche qui vient d'être créée ici : elle reste en tête et son titre prend le focus,
  // sans sauter dans l'ordre alphabétique à chaque lettre tapée.
  const [fresh, setFresh] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (fresh) mainRef.current?.querySelector<HTMLInputElement>(`input[data-card="${fresh}"]`)?.focus();
  }, [fresh]);

  const sections = useMemo(
    () =>
      ORDER.map((type) => ({
        type,
        cards: nodes
          .filter((n) => n.data.type === type)
          .map((n) => n.data)
          .sort((a, b) => (a.id === fresh ? -1 : b.id === fresh ? 1 : a.title.localeCompare(b.title, lang))),
      })).filter((s) => s.cards.length > 0),
    [nodes, lang, fresh],
  );
  const [current, setCurrent] = useState<CardType | null>(null);
  const shown = sections.find((s) => s.type === current) ?? sections[0];

  const create = (type: CardType) => {
    setCurrent(type);
    setFresh(addTitledCard(type, ""));
  };

  const titleOf = (id: string) => {
    const d = nodes.find((n) => n.id === id)?.data;
    if (!d) return "?";
    if (d.title) return d.title;
    // Carte sans titre : on montre le début de son texte.
    const text = new DOMParser().parseFromString(d.html, "text/html").body.textContent?.trim() ?? "";
    return text ? (text.length > 32 ? `${text.slice(0, 32)}…` : text) : t.bible.untitled;
  };

  /** Une fiche de chaque type peut naître ici. */
  const adders = (
    <div className="bible-add">
      <div className="eyebrow">{t.bible.add}</div>
      {ORDER.map((type) => (
        <button
          key={type}
          type="button"
          className="ghost-button"
          aria-label={fmt(t.bible.addType, { type: types[type].label })}
          onClick={() => create(type)}
        >
          <span className="card-dot" style={{ background: typeColor(type) }} />
          {types[type].label}
        </button>
      ))}
    </div>
  );

  if (!shown) {
    return (
      <div className="empty-view">
        <h1>{t.bible.emptyTitle}</h1>
        <p>{t.bible.emptyBody}</p>
        {adders}
      </div>
    );
  }

  return (
    <div className="bible">
      <nav className="bible-toc" aria-label={t.bible.tocAria}>
        <div className="eyebrow">{t.bible.tocTitle}</div>
        <ul>
          {sections.map((s) => (
            <li key={s.type}>
              <button
                type="button"
                className={s === shown ? "is-current" : ""}
                aria-current={s === shown ? "true" : undefined}
                onClick={() => setCurrent(s.type)}
              >
                <span className="toc-label">
                  <span className="card-dot" style={{ background: typeColor(s.type) }} />
                  {types[s.type].section}
                </span>
                <span className="toc-count">{s.cards.length}</span>
              </button>
            </li>
          ))}
        </ul>
        {adders}
      </nav>

      <section className="bible-main" aria-label={types[shown.type].section} ref={mainRef}>
        <h1>{types[shown.type].section}</h1>
        {shown.cards.map((card) => {
          const links = edges.filter((e) => e.source === card.id || e.target === card.id);
          return (
            <article key={card.id} className="bible-entry" style={{ ["--type" as string]: typeColor(shown.type) }}>
              <header>
                <h2>
                  {/* Le titre se change ici comme sur le canevas : c'est la même carte. */}
                  <input
                    type="text"
                    data-card={card.id}
                    className={`bible-title${kind === "scenario" && shown.type === "scene" ? " is-slugline" : ""}`}
                    value={card.title}
                    placeholder={types[shown.type].titlePlaceholder}
                    aria-label={t.bible.titleAria}
                    autoComplete="off"
                    onChange={(e) => updateCard(card.id, { title: e.target.value })}
                    onBlur={() => card.id === fresh && setFresh(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                    }}
                  />
                </h2>
                <button type="button" className="link-button" onClick={() => setView("toile", card.id)}>
                  {t.bible.seeOnCanvas}
                </button>
              </header>
              {card.html ? (
                // HTML produit par TipTap ou nettoyé au chargement (voir sanitizeHtml).
                <div className="bible-body" dangerouslySetInnerHTML={{ __html: card.html }} />
              ) : (
                <p className="muted">{t.bible.toDig}</p>
              )}
              {links.length > 0 && (
                <div className="bible-links">
                  <span className="eyebrow">{t.bible.linkedTo}</span>
                  {links.map((e) => {
                    const other = e.source === card.id ? e.target : e.source;
                    return (
                      <span key={e.id} className="chip">
                        {titleOf(other)}
                        {e.label ? ` · ${String(e.label)}` : ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
