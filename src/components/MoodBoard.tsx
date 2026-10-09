// Tableau d'ambiance de la Bible : toutes les images du projet (portraits, lieux, sources…) en mosaïque,
// rangées par type. Aucune donnée propre : ce sont les images des cartes. Toucher une image ouvre sa fiche.

import { useMemo } from "react";
import { useCosmos } from "../store";
import { fmt } from "../i18n";
import { useVocab } from "../vocab";
import { useSettings } from "../settings";
import { moodImages } from "../relations";
import { BIBLE_ORDER, typeColor, type CardType } from "../types";
import { useMediaUrl } from "./useMediaUrl";

function Tile({ name, title, type, onOpen }: { name: string; title: string; type: CardType; onOpen: () => void }) {
  const { t, types } = useVocab();
  const url = useMediaUrl(name);
  const label = title.trim() || t.bible.untitled;
  return (
    <button type="button" className="mood-tile" aria-label={fmt(t.mood.open, { title: label, type: types[type].label })} onClick={onOpen}>
      {url ? <img src={url} alt="" loading="lazy" /> : <span className="mood-missing" />}
      <span className="mood-caption">
        <span className="card-dot" style={{ background: typeColor(type) }} />
        {label}
      </span>
    </button>
  );
}

export function MoodBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const { t, types } = useVocab();
  const lang = useSettings((s) => s.lang);
  const nodes = useCosmos((s) => s.nodes);
  const images = useMemo(() => moodImages(nodes.map((n) => n.data), BIBLE_ORDER, lang), [nodes, lang]);
  if (images.length === 0) return <p className="muted">{t.mood.empty}</p>;
  // Une mosaïque par type, dans l'ordre de la Bible (personnages, lieux…).
  const groups = BIBLE_ORDER.map((type) => ({ type, items: images.filter((img) => img.type === type) })).filter((g) => g.items.length > 0);
  return (
    <>
      {groups.map((g) => (
        <section key={g.type} className="mood-group" aria-label={types[g.type].section}>
          <h2 className="mood-title">
            <span className="card-dot" style={{ background: typeColor(g.type) }} />
            {types[g.type].section}
          </h2>
          <div className="mood">
            {g.items.map((img) => (
              <Tile key={`${img.cardId}-${img.name}`} name={img.name} title={img.title} type={img.type} onOpen={() => onOpen(img.cardId)} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
