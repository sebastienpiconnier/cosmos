// Contenu de la fenêtre « Corbeille » : les cartes supprimées, à remettre à leur place ou à supprimer
// pour de bon. Chaque geste est une étape d'annulation, comme la suppression elle-même.

import { useEffect } from "react";
import { useCosmos } from "../store";
import { fmt, useT } from "../i18n";
import { useSettings } from "../settings";
import { typeColor } from "../types";
import { useVocab } from "../vocab";

export function TrashList() {
  const { t, types } = useVocab();
  const lang = useSettings((s) => s.lang);
  const trash = useCosmos((s) => s.trash);
  const restore = useCosmos((s) => s.restoreFromTrash);
  const purge = useCosmos((s) => s.purgeTrash);
  const x = t.trash;
  const day = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
  };

  return (
    <div className="trash">
      <h2 id="app-dialog-title">{x.title}</h2>
      {trash.length === 0 ? (
        <p className="muted">{x.empty}</p>
      ) : (
        <>
          <p className="muted">{x.intro}</p>
          <ul className="trash-list">
            {trash.map((card) => {
              const title = card.title.trim() || t.bible.untitled;
              return (
                <li key={card.id}>
                  <span className="card-dot" style={{ background: typeColor(card.type) }} />
                  <span className="trash-name">
                    <strong>{title}</strong>
                    <span className="muted">
                      {types[card.type].label} · {fmt(x.deletedOn, { date: day(card.trashed.date) })}
                      {card.trashed.scene ? ` · ${x.withScene}` : ""}
                    </span>
                  </span>
                  <button type="button" className="ghost-button" aria-label={fmt(x.restoreAria, { title })} onClick={() => restore(card.id)}>
                    {x.restore}
                  </button>
                  <button type="button" className="ghost-button is-danger" aria-label={fmt(x.purgeAria, { title })} onClick={() => purge(card.id)}>
                    {x.purge}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="link-button trash-purge" onClick={() => purge()}>
            {x.purgeAll}
          </button>
        </>
      )}
    </div>
  );
}

/** Message après une suppression : la carte est dans la corbeille ; Annuler ou aller la voir. */
export function TrashNotice() {
  const t = useT();
  const notice = useCosmos((s) => s.trashNotice);
  const clear = useCosmos((s) => s.clearTrashNotice);
  // Le message s'efface seul après dix secondes ; la corbeille, elle, garde la carte.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      if (useCosmos.getState().trashNotice?.at === notice.at) clear();
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [notice, clear]);
  if (!notice) return null;
  const text = notice.count > 1 ? fmt(t.trash.movedMany, { n: notice.count }) : notice.title ? fmt(t.trash.moved, { title: notice.title }) : t.trash.movedUntitled;
  return (
    <div className="trash-notice" role="status" key={notice.at}>
      <span>{text}</span>
      <button
        type="button"
        className="ghost-button"
        onClick={() => {
          useCosmos.getState().undo();
          clear();
        }}
      >
        {t.trash.undo}
      </button>
      <button type="button" className="ghost-button" onClick={() => useCosmos.getState().setDialog("trash")}>
        {t.trash.see}
      </button>
      <button type="button" className="icon-button" aria-label={t.gallery.close} title={t.gallery.close} onClick={clear}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
