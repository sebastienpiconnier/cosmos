// Fiche d'identité d'un personnage, dans la Bible : des caractéristiques standard (rôle, âge, métier,
// apparence, objectif, faille…). Tout est facultatif : on remplit ce qu'on sait, le reste attend.
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
  const id = useId();

  const field = (key: CharacterField) => {
    const value = card.fiche?.[key] ?? "";
    const props = {
      id: `${id}-${key}`,
      value,
      placeholder: t.placeholders[key],
      onChange: (e: { target: { value: string } }) => setFiche(card.id, key, e.target.value),
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
        <div id={`${id}-fields`} className="sheet-fields">
          {CHARACTER_FIELDS.map(field)}
        </div>
      )}
    </section>
  );
}
