// Fiche d'identité d'un personnage, dans la Bible : des caractéristiques standard (rôle, genre, âge,
// métier, surnoms, apparence, objectif, faille, relations…). Tout est facultatif. Comme dans la Bible
// du fork de NEO, seuls les champs remplis restent sous les yeux ; « Plus de détails » montre les autres.
// Les valeurs vivent dans la carte (frontmatter `fiche`), jamais recopiées ailleurs.

import { useId, useState } from "react";
import { useCosmos } from "../store";
import { fmt, useT } from "../i18n";
import { CHARACTER_FIELDS, SHORT_FIELDS, ficheCount, type CharacterField } from "../character";
import type { CardData } from "../types";

export function CharacterSheet({ card }: { card: CardData }) {
  const t = useT().character;
  const setFiche = useCosmos((s) => s.setFiche);
  const filled = ficheCount(card);
  // Ouverte d'office quand quelque chose est rempli ; sinon un bouton invite à la compléter.
  const [open, setOpen] = useState(filled > 0);
  // Champs vides affichés. Une fiche vide les montre tous.
  const [more, setMore] = useState(false);
  // Un champ qu'on vient de vider reste à l'écran le temps de la saisie.
  const [touched, setTouched] = useState<Set<CharacterField>>(new Set());
  const id = useId();
  const all = more || filled === 0;
  const shown = CHARACTER_FIELDS.filter((key) => all || (card.fiche?.[key] ?? "").trim() || touched.has(key));
  const empty = CHARACTER_FIELDS.length - filled;

  const field = (key: CharacterField) => {
    const value = card.fiche?.[key] ?? "";
    const props = {
      id: `${id}-${key}`,
      value,
      placeholder: t.placeholders[key],
      onChange: (e: { target: { value: string } }) => {
        if (!touched.has(key)) setTouched(new Set(touched).add(key));
        setFiche(card.id, key, e.target.value);
      },
    };
    return (
      <div key={key} className={`sheet-field${SHORT_FIELDS.has(key) ? " is-short" : ""}`}>
        <label htmlFor={props.id}>{t.fields[key]}</label>
        {SHORT_FIELDS.has(key) ? <input type="text" autoComplete="off" {...props} /> : <textarea rows={1} {...props} />}
      </div>
    );
  };

  return (
    <section className="sheet" aria-label={t.sheet}>
      <button type="button" className="sheet-toggle" aria-expanded={open} aria-controls={`${id}-fields`} onClick={() => setOpen(!open)}>
        <span>{t.sheet}</span>
        <span className="sheet-count">{fmt(t.filled, { n: filled, total: CHARACTER_FIELDS.length })}</span>
        <span aria-hidden="true" className="sheet-chevron">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div id={`${id}-fields`}>
          <div className="sheet-fields">{shown.map(field)}</div>
          {filled > 0 && empty > 0 && (
            <button type="button" className="link-button sheet-more" aria-expanded={more} onClick={() => setMore(!more)}>
              {more ? t.fewerDetails : fmt(t.moreDetails, { n: empty })}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
