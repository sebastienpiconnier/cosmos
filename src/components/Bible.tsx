// La bible se construit toute seule à partir des cartes typées du canevas.
// Aucune donnée propre : c'est une autre lecture du même projet. On peut aussi y créer une fiche
// et la nommer : c'est une carte comme les autres, qui apparaît aussitôt sur le canevas.
// Tout s'y modifie sur place : titre, texte (le corps de la carte) et, pour un personnage, sa fiche
// d'identité. Le portrait d'un personnage tient dans un cercle, à côté de son nom.

import { useEffect, useMemo, useRef, useState } from "react";
import { useCosmos } from "../store";
import { BIBLE_ORDER as ORDER, typeColor, type CardData, type CardType } from "../types";
import { fmt, useT } from "../i18n";
import { POSTER_FIELDS } from "../character";
import { mentionsIn } from "../manuscript";
import { bookOrder } from "../book";
import { useVocab } from "../vocab";
import { useSettings } from "../settings";
import { useMediaUrl } from "./useMediaUrl";
import { CharacterAssistant } from "./CharacterAssistant";
import { CharacterSheet } from "./CharacterSheet";
import { BibleBody } from "./BibleBody";

/** Image d'une fiche, en tête (la même que sur sa carte). Proportions gardées, bandes comblées par un fond flou. */
function EntryImage({ name, alt }: { name: string | undefined; alt: string }) {
  const url = useMediaUrl(name);
  if (!url) return null;
  return (
    <div className="bible-image">
      <img className="bible-image-backdrop" src={url} alt="" aria-hidden="true" />
      <img className="bible-image-main" src={url} alt={alt} />
    </div>
  );
}

/**
 * Sous le nom : genre, âge, métier, rôle (personnage), puis la présence dans le manuscrit
 * (« cité 12 fois, dès la scène 3 »). Idées reprises de la Bible du fork de NEO.
 */
function Poster({ card }: { card: CardData }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const nodes = useCosmos((s) => s.nodes);
  const plan = useCosmos((s) => s.plan);
  const manuscript = useCosmos((s) => s.manuscript);
  const order = useMemo(() => bookOrder(nodes, plan), [nodes, plan]);
  const seen = useMemo(() => mentionsIn(card, manuscript, order), [card, manuscript, order]);
  const traits = card.type === "personnage" ? POSTER_FIELDS.map((key) => card.fiche?.[key]?.trim()).filter(Boolean) : [];
  const firstTitle = seen.first ? nodes.find((n) => n.id === seen.first)?.data.title.trim() || t.manuscript.untitled : "";
  const num = new Intl.NumberFormat(lang).format(seen.count);
  if (traits.length === 0 && seen.count === 0 && !Object.keys(manuscript).length) return null;
  return (
    <p className="bible-poster">
      {traits.length > 0 && <span className="bible-traits">{traits.join(" · ")}</span>}
      {Object.keys(manuscript).length > 0 && (
        <span className="bible-mentions">
          {seen.count === 0
            ? t.character.notInText
            : fmt(seen.count === 1 ? t.character.mentionsOne : t.character.mentionsMany, { n: num, scene: order.indexOf(seen.first!) + 1, title: firstTitle })}
        </span>
      )}
    </p>
  );
}

/** Portrait d'un personnage, dans un cercle. */
function Portrait({ name, alt }: { name: string | undefined; alt: string }) {
  const url = useMediaUrl(name);
  return url ? <img className="bible-portrait" src={url} alt={alt} /> : null;
}

export function Bible() {
  const { t, types, kind } = useVocab();
  const lang = useSettings((s) => s.lang);
  const nodes = useCosmos((s) => s.nodes);
  const edges = useCosmos((s) => s.edges);
  const setView = useCosmos((s) => s.setView);
  const updateCard = useCosmos((s) => s.updateCard);
  const addTitledCard = useCosmos((s) => s.addTitledCard);
  const pickCardImage = useCosmos((s) => s.pickCardImage);
  const target = useCosmos((s) => s.bibleTarget);
  const clearTarget = useCosmos((s) => s.clearBibleTarget);
  // Fiche ouverte depuis le canevas (« 3 questions à compléter ») : assistant ouvert sur elle.
  const [assisted, setAssisted] = useState<string | null>(null);

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

  // Arrivée depuis le canevas : la bonne partie, la fiche à l'écran, l'assistant ouvert si demandé.
  useEffect(() => {
    if (!target) return;
    const card = nodes.find((n) => n.id === target.id)?.data;
    clearTarget();
    if (!card) return;
    setCurrent(card.type);
    if (target.assistant) setAssisted(card.id);
    requestAnimationFrame(() => mainRef.current?.querySelector(`[data-entry="${card.id}"]`)?.scrollIntoView({ block: "start" }));
  }, [target, nodes, clearTarget]);

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
            <article key={card.id} data-entry={card.id} className={`bible-entry${shown.type === "personnage" ? " is-character" : ""}`} style={{ ["--type" as string]: typeColor(shown.type) }}>
              {shown.type !== "personnage" && (
                <EntryImage name={card.image} alt={card.title ? fmt(t.card.imageAlt, { title: card.title }) : t.card.imageAltUntitled} />
              )}
              <header>
                {shown.type === "personnage" &&
                  (card.image ? (
                    <button type="button" className="bible-portrait-button" aria-label={t.card.changeImage} title={t.card.changeImage} onClick={() => pickCardImage(card.id)}>
                      <Portrait name={card.image} alt={card.title ? fmt(t.card.imageAlt, { title: card.title }) : t.card.imageAltUntitled} />
                    </button>
                  ) : (
                    <button type="button" className="bible-portrait-button is-empty" aria-label={t.character.addPortrait} title={t.character.addPortrait} onClick={() => pickCardImage(card.id)}>
                      <span aria-hidden="true">{(card.title.trim()[0] ?? "?").toUpperCase()}</span>
                    </button>
                  ))}
                <div className="bible-heading">
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
                {(shown.type === "personnage" || shown.type === "lieu") && <Poster card={card} />}
                </div>
                <button type="button" className="link-button" onClick={() => setView("toile", card.id)}>
                  {t.bible.seeOnCanvas}
                </button>
              </header>
              {shown.type === "personnage" && <CharacterSheet card={card} />}
              {/* Le texte se modifie ici comme sur le canevas : c'est le corps de la même carte. */}
              <BibleBody card={card} />
              {shown.type === "personnage" && <CharacterAssistant card={card} startOpen={assisted === card.id} />}
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
