// La bible se construit toute seule à partir des cartes typées de la toile.
// Aucune donnée propre : c'est une autre lecture du même projet.

import { useMemo, useState } from "react";
import { useCosmos } from "../store";
import { typeColor, type CardType } from "../types";
import { useT } from "../i18n";
import { useSettings } from "../settings";

// Ordre de la bible : les personnages d'abord, les idées en vrac à la fin.
const ORDER: CardType[] = ["personnage", "lieu", "scene", "theme", "question", "idee"];

export function Bible() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const nodes = useCosmos((s) => s.nodes);
  const edges = useCosmos((s) => s.edges);
  const setView = useCosmos((s) => s.setView);

  const sections = useMemo(
    () =>
      ORDER.map((type) => ({
        type,
        cards: nodes
          .filter((n) => n.data.type === type)
          .map((n) => n.data)
          .sort((a, b) => a.title.localeCompare(b.title, lang)),
      })).filter((s) => s.cards.length > 0),
    [nodes, lang],
  );
  const [current, setCurrent] = useState<CardType | null>(null);
  const shown = sections.find((s) => s.type === current) ?? sections[0];

  const titleOf = (id: string) => {
    const d = nodes.find((n) => n.id === id)?.data;
    if (!d) return "?";
    if (d.title) return d.title;
    // Carte sans titre : on montre le début de son texte.
    const text = new DOMParser().parseFromString(d.html, "text/html").body.textContent?.trim() ?? "";
    return text ? (text.length > 32 ? `${text.slice(0, 32)}…` : text) : t.bible.untitled;
  };

  if (!sections.length) {
    return (
      <div className="empty-view">
        <h1>{t.bible.emptyTitle}</h1>
        <p>{t.bible.emptyBody}</p>
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
                  {t.types[s.type].section}
                </span>
                <span className="toc-count">{s.cards.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section className="bible-main" aria-label={t.types[shown.type].section}>
        <h1>{t.types[shown.type].section}</h1>
        {shown.cards.map((card) => {
          const links = edges.filter((e) => e.source === card.id || e.target === card.id);
          return (
            <article key={card.id} className="bible-entry" style={{ ["--type" as string]: typeColor(shown.type) }}>
              <header>
                <h2>{card.title || t.bible.untitled}</h2>
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
