// Bouton « Exporter » d'un projet scénario : PDF au format standard, Fountain, Final Draft (FDX).
// Menu de vrais boutons : souris, doigt et clavier (Échap referme, le focus revient sur le bouton).

import { useEffect, useId, useRef, useState } from "react";
import { useT } from "../i18n";
import { useCosmos } from "../store";
import { useSettings } from "../settings";
import { SCREENPLAY_FILE, storage } from "../storage";
import { EXPORT_FORMATS, exportScreenplay, type ExportFormat } from "../screenplay/export";

export function ExportMenu() {
  const t = useT().screenplay.export;
  const strings = useT().screenplay;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

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

  const run = async (format: ExportFormat) => {
    const { screenplay, savedScreenplay, lastFiles, title, paper } = useCosmos.getState();
    if (!screenplay || busy) return;
    setBusy(true);
    setMessage(t.working);
    try {
      const file = await exportScreenplay(screenplay, format, {
        title,
        paper,
        locale: useSettings.getState().lang,
        strings: { more: strings.more, contd: strings.contd },
        // Scénario inchangé depuis le disque : on exporte le fichier lui-même, à l'octet près.
        source: screenplay === savedScreenplay ? lastFiles[SCREENPLAY_FILE] : undefined,
      });
      const saved = await storage.saveAs(file, t[format]);
      setMessage(saved ? t.done : "");
      if (saved) setOpen(false);
    } catch (err) {
      console.error(err);
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="ghost-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setMessage("");
          setOpen(!open);
        }}
      >
        {t.button}
      </button>
      {open && (
        <div className="settings-panel export-panel" id={panelId} role="group" aria-label={t.menuAria}>
          {EXPORT_FORMATS.map((format) => (
            <button key={format} type="button" className="ghost-button" disabled={busy} onClick={() => run(format)}>
              {t[format]}
            </button>
          ))}
        </div>
      )}
      {/* Annoncé aux lecteurs d'écran ; visible seulement en cas d'échec. */}
      <span className={message === t.failed ? "export-error" : "sr-only"} role="status">
        {message}
      </span>
    </div>
  );
}
