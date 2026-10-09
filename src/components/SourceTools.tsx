// Outils d'une carte Source, dans la Bible : ouvrir l'adresse, et compléter la référence depuis la page
// (titre, site, auteur, date), sur demande seulement. Les champs déjà remplis par l'auteur ne sont pas écrasés.

import { useState } from "react";
import { useCosmos } from "../store";
import { fmt, useT } from "../i18n";
import { sourceUrl } from "../character";
import { openExternal } from "../platform";
import { readPage } from "../web";
import type { CardData } from "../types";

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function SourceTools({ card }: { card: CardData }) {
  const t = useT().research;
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const url = sourceUrl(card);
  if (!url) return null;

  const complete = async () => {
    setBusy(true);
    setSaid(t.fetching);
    try {
      const info = await readPage(url);
      const host = hostOf(url);
      const fiche = { ...(card.fiche ?? {}) };
      if (!fiche.auteur && info.author) fiche.auteur = info.author;
      if (!fiche.publication && (info.site || info.published)) fiche.publication = [info.site, info.published].filter(Boolean).join(", ");
      // Le titre ne remplace que le nom du site posé au collage (ou un titre vide).
      const title = info.title && (!card.title.trim() || card.title.trim() === host) ? info.title : card.title;
      useCosmos.getState().updateCard(card.id, { title, fiche });
      setSaid(t.fetched);
    } catch (err) {
      console.error(err);
      setSaid(t.fetchFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="source-tools">
      <button type="button" className="ghost-button" onClick={() => void openExternal(url)}>
        ↗ {fmt(t.open, { host: hostOf(url) })}
      </button>
      <button type="button" className="ghost-button" disabled={busy} onClick={() => void complete()}>
        {busy ? t.fetching : t.fetch}
      </button>
      <p className="settings-hint" role="status">
        {said}
      </p>
    </div>
  );
}
