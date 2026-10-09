// Outils d'une carte Source, dans la Bible : ouvrir l'adresse, et compléter la référence depuis la page
// (titre, site, auteur, date), sur demande seulement. Les champs déjà remplis par l'auteur ne sont pas écrasés.

import { useState } from "react";
import { useCosmos } from "../store";
import { fmt, useT } from "../i18n";
import { sourceUrl } from "../character";
import { openExternal } from "../platform";
import { hostOf } from "../research";
import type { CardData } from "../types";

export { hostOf };

export function SourceTools({ card }: { card: CardData }) {
  const t = useT().research;
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const url = sourceUrl(card);
  if (!url) return null;

  const complete = async () => {
    setBusy(true);
    setSaid(t.fetching);
    const ok = await useCosmos.getState().completeSource(card.id);
    setSaid(ok ? t.fetched : t.fetchFailed);
    setBusy(false);
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
