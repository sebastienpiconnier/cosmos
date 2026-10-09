// Recherche de photos Pexels, dans la fenêtre commune (<dialog>, Échap ferme). Sans clé : on explique
// comment en obtenir une et on la garde sur l'appareil. Avec : une grille de vignettes, de vrais boutons
// (souris, doigt, clavier) ; la photo choisie devient une carte Image créditée, ou rejoint une galerie.

import { useState } from "react";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { fmt, useT } from "../i18n";
import { openExternal } from "../platform";
import type { PexelsError, PexelsPhoto } from "../pexels";

const KEY_PAGE = "https://www.pexels.com/api/";
const PEXELS = "https://www.pexels.com";

export function PexelsSearch() {
  const t = useT().pexels;
  const key = useSettings((s) => s.pexelsKey);
  const [draftKey, setDraftKey] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<"" | "search" | "add">("");
  const [error, setError] = useState("");

  const errorText = (e: unknown) => {
    const code = (e instanceof Error ? e.message : "network") as PexelsError;
    return code === "key" ? t.errorKey : code === "limit" ? t.errorLimit : t.errorNetwork;
  };

  const run = async (q: string, n: number) => {
    if (!q.trim() || busy) return;
    setBusy("search");
    setError("");
    try {
      const { searchPexels } = await import("../pexels");
      const result = await searchPexels(key, q.trim(), n, useSettings.getState().lang);
      setPhotos(n === 1 ? result.photos : [...photos, ...result.photos.filter((p) => !photos.some((o) => o.id === p.id))]);
      setTotal(result.total);
      setMore(result.more);
      setPage(n);
      setAsked(q.trim());
    } catch (e) {
      setError(errorText(e));
      if (e instanceof Error && e.message === "key") setEditingKey(true);
    } finally {
      setBusy("");
    }
  };

  const pick = async (photo: PexelsPhoto) => {
    if (busy) return;
    setBusy("add");
    setError("");
    const ok = await useCosmos.getState().addPexelsPhoto(photo);
    setBusy("");
    if (ok) useCosmos.getState().setDialog(null);
    else setError(t.errorDownload);
  };

  if (!key || editingKey) {
    return (
      <div className="pexels">
        <h2 id="app-dialog-title">{t.keyTitle}</h2>
        <p>{t.keyIntro}</p>
        <button type="button" className="link-button" onClick={() => void openExternal(KEY_PAGE)}>
          ↗ {t.keyGet}
        </button>
        <form
          className="pexels-key"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draftKey.trim()) return;
            useSettings.getState().setPexelsKey(draftKey);
            setDraftKey("");
            setEditingKey(false);
            setError("");
          }}
        >
          <label htmlFor="pexels-key">{t.keyLabel}</label>
          <input id="pexels-key" type="password" autoComplete="off" spellCheck={false} value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
          <button type="submit" className="ghost-button" disabled={!draftKey.trim()}>
            {t.keySave}
          </button>
        </form>
        {error && <p className="pexels-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="pexels">
      <h2 id="app-dialog-title">{t.title}</h2>
      <form
        className="pexels-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void run(query, 1);
        }}
      >
        <label className="sr-only" htmlFor="pexels-query">
          {t.queryLabel}
        </label>
        <input id="pexels-query" type="search" autoFocus value={query} placeholder={t.queryPlaceholder} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" className="ghost-button" disabled={!query.trim() || busy !== ""}>
          {busy === "search" ? t.searching : t.search}
        </button>
      </form>
      <p className="settings-hint" role="status">
        {busy === "add" ? t.adding : error ? "" : asked ? (photos.length === 0 ? t.noResult : fmt(t.results, { n: total.toLocaleString(useSettings.getState().lang) })) : ""}
      </p>
      {error && <p className="pexels-error" role="alert">{error}</p>}
      {photos.length > 0 && (
        <ul className="pexels-grid">
          {photos.map((p) => (
            <li key={p.id}>
              <button type="button" className="pexels-photo" disabled={busy !== ""} onClick={() => void pick(p)} aria-label={fmt(t.pick, { alt: p.alt || fmt(t.photoBy, { name: p.photographer }) })}>
                <img src={p.thumb} alt="" loading="lazy" draggable={false} />
              </button>
              {p.photographer && <span className="pexels-by">{fmt(t.by, { name: p.photographer })}</span>}
            </li>
          ))}
        </ul>
      )}
      {more && (
        <button type="button" className="ghost-button pexels-more" disabled={busy !== ""} onClick={() => void run(asked, page + 1)}>
          {t.more}
        </button>
      )}
      <div className="pexels-foot">
        <button type="button" className="link-button" onClick={() => void openExternal(PEXELS)}>
          {t.credit}
        </button>
        <button type="button" className="link-button" onClick={() => setEditingKey(true)}>
          {t.keyChange}
        </button>
      </div>
    </div>
  );
}
