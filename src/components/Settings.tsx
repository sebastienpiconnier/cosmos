// Bouton « Réglages » : langue de l'interface et apparence (système, claire, sombre).
// Listes déroulantes natives : accessibles au clavier, au lecteur d'écran et au doigt.

import { useEffect, useId, useRef, useState } from "react";
import { DICTIONARIES, LANGS, isLang, useT } from "../i18n";
import { useSettings, type ThemePref } from "../settings";
import { useCosmos } from "../store";
import { PROJECT_KINDS, isProjectKind } from "../types";
import { PAPERS, isPaper } from "../screenplay/layout";

export function Settings() {
  const t = useT();
  const { lang, themePref, setLang, setThemePref } = useSettings();
  const kind = useCosmos((s) => s.kind);
  const setKind = useCosmos((s) => s.setKind);
  const paper = useCosmos((s) => s.paper);
  const setPaper = useCosmos((s) => s.setPaper);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ids = { panel: useId(), lang: useId(), theme: useId(), kind: useId(), kindHint: useId(), paper: useId(), paperHint: useId() };

  // Fermeture : Échap (retour du focus sur le bouton) ou clic/appui à l'extérieur.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const themes: { value: ThemePref; label: string }[] = [
    { value: "system", label: t.settings.themeSystem },
    { value: "light", label: t.settings.themeLight },
    { value: "dark", label: t.settings.themeDark },
  ];

  return (
    <div className="settings" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button"
        aria-label={t.settings.title}
        aria-expanded={open}
        aria-controls={ids.panel}
        onClick={() => setOpen(!open)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </button>

      {open && (
        <div className="settings-panel" id={ids.panel} role="group" aria-label={t.settings.title}>
          {/* Réglage du projet (enregistré dans cosmos.json) */}
          <div className="eyebrow">{t.kinds.section}</div>
          <label htmlFor={ids.kind}>{t.kinds.label}</label>
          <select
            id={ids.kind}
            value={kind}
            aria-describedby={ids.kindHint}
            onChange={(e) => isProjectKind(e.target.value) && setKind(e.target.value)}
          >
            {PROJECT_KINDS.map((k) => (
              <option key={k} value={k}>
                {t.kinds[k]}
              </option>
            ))}
          </select>
          <p className="settings-hint" id={ids.kindHint}>
            {t.kinds.hint}
          </p>
          {kind === "scenario" && (
            <>
              <label htmlFor={ids.paper}>{t.kinds.paper}</label>
              <select
                id={ids.paper}
                value={paper}
                aria-describedby={ids.paperHint}
                onChange={(e) => isPaper(e.target.value) && setPaper(e.target.value)}
              >
                {PAPERS.map((p) => (
                  <option key={p} value={p}>
                    {p === "letter" ? t.kinds.paperLetter : t.kinds.paperA4}
                  </option>
                ))}
              </select>
              <p className="settings-hint" id={ids.paperHint}>
                {t.kinds.paperHint}
              </p>
            </>
          )}

          {/* Réglages de l'appareil (langue, apparence) */}
          <div className="eyebrow settings-sep">{t.settings.title}</div>
          <label htmlFor={ids.lang}>{t.settings.language}</label>
          <select id={ids.lang} value={lang} onChange={(e) => isLang(e.target.value) && setLang(e.target.value)}>
            {LANGS.map((code) => (
              // Chaque langue est écrite dans sa propre langue (« English », « Français »).
              <option key={code} value={code} lang={code}>
                {DICTIONARIES[code].meta.name}
              </option>
            ))}
          </select>
          <label htmlFor={ids.theme}>{t.settings.theme}</label>
          <select id={ids.theme} value={themePref} onChange={(e) => setThemePref(e.target.value as ThemePref)}>
            {themes.map((th) => (
              <option key={th.value} value={th.value}>
                {th.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
