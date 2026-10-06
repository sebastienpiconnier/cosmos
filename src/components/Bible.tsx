// La bible se construit toute seule à partir des cartes typées de la toile.
// Aucune donnée propre : c'est une autre lecture du même projet.

import { useMemo, useState } from "react";
import { useCosmos } from "../store";
import { CARD_TYPES, type CardType } from "../types";

// Ordre de la bible : les personnages d'abord, les idées en vrac à la fin.
const ORDER: CardType[] = ["personnage", "lieu", "scene", "theme", "question", "idee"];

export function Bible() {
  const nodes = useCosmos((s) => s.nodes);
  const edges = useCosmos((s) => s.edges);
  const setView = useCosmos((s) => s.setView);

  const sections = useMemo(
    () =>
      ORDER
        .map((type) => ({
          info: CARD_TYPES.find((t) => t.type === type)!,
          cards: nodes
            .filter((n) => n.data.type === type)
            .map((n) => n.data)
            .sort((a, b) => a.title.localeCompare(b.title, "fr")),
        }))
        .filter((s) => s.cards.length > 0),
    [nodes],
  );
  const [current, setCurrent] = useState<CardType | null>(null);
  const shown = sections.find((s) => s.info.type === current) ?? sections[0];

  const titleOf = (id: string) => {
    const d = nodes.find((n) => n.id === id)?.data;
    if (!d) return "?";
    if (d.title) return d.title;
    // Carte sans titre : on montre le début de son texte.
    const text = new DOMParser().parseFromString(d.html, "text/html").body.textContent?.trim() ?? "";
    return text ? (text.length > 32 ? `${text.slice(0, 32)}…` : text) : "Sans titre";
  };

  if (!sections.length) {
    return (
      <div className="empty-view">
        <h1>La bible est vide</h1>
        <p>Crée des cartes sur la toile et transforme-les avec « / » : elles apparaîtront ici, rangées.</p>
      </div>
    );
  }

  return (
    <div className="bible">
      <nav className="bible-toc" aria-label="Sommaire de la bible">
        <div className="eyebrow">Sommaire, généré automatiquement</div>
        <ul>
          {sections.map((s) => (
            <li key={s.info.type}>
              <button
                type="button"
                className={s === shown ? "is-current" : ""}
                aria-current={s === shown ? "true" : undefined}
                onClick={() => setCurrent(s.info.type)}
              >
                <span className="toc-label">
                  <span className="card-dot" style={{ background: s.info.color }} />
                  {s.info.bibleSection}
                </span>
                <span className="toc-count">{s.cards.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section className="bible-main" aria-label={shown.info.bibleSection}>
        <h1>{shown.info.bibleSection}</h1>
        {shown.cards.map((card) => {
          const links = edges.filter((e) => e.source === card.id || e.target === card.id);
          return (
            <article key={card.id} className="bible-entry" style={{ ["--type" as string]: shown.info.color }}>
              <header>
                <h2>{card.title || "Sans titre"}</h2>
                <button type="button" className="link-button" onClick={() => setView("toile", card.id)}>
                  Voir sur la toile
                </button>
              </header>
              {card.html ? (
                // HTML produit par TipTap ou nettoyé au chargement (voir sanitizeHtml).
                <div className="bible-body" dangerouslySetInnerHTML={{ __html: card.html }} />
              ) : (
                <p className="muted">À creuser</p>
              )}
              {links.length > 0 && (
                <div className="bible-links">
                  <span className="eyebrow">Relié à</span>
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
