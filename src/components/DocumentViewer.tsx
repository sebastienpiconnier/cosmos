// Liseuse d'une carte Document : les pages du PDF l'une sous l'autre, dessinées par pdf.js à mesure
// qu'elles arrivent à l'écran. Dans l'app, sur ordinateur comme sur mobile : pas besoin d'ouvrir un autre
// logiciel ni d'autoriser l'accès au fichier. Affichée dans la fenêtre commune (<dialog>, Échap ferme).

import { useEffect, useRef, useState } from "react";
import { useCosmos } from "../store";
import { storage } from "../storage";
import { fmt, useT } from "../i18n";
import type { PdfDoc } from "../pdfDocument";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "failed" } | { kind: "ready"; doc: PdfDoc };

export function DocumentViewer() {
  const t = useT().documents;
  const id = useCosmos((s) => s.documentCard);
  const card = useCosmos((s) => s.nodes.find((n) => n.id === id)?.data);
  const [state, setState] = useState<State>({ kind: "loading" });
  const fichier = card?.fichier;

  useEffect(() => {
    if (!fichier) return;
    let alive = true;
    let opened: PdfDoc | null = null;
    setState({ kind: "loading" });
    (async () => {
      try {
        const data = await storage.readMedia(fichier);
        if (!alive) return;
        if (!data) return setState({ kind: "missing" });
        const pdf = await import("../pdfDocument");
        opened = await pdf.openPdf(data);
        if (alive) setState({ kind: "ready", doc: opened });
        else void opened.loadingTask.destroy();
      } catch (err) {
        console.error(err);
        if (alive) setState({ kind: "failed" });
      }
    })();
    return () => {
      alive = false;
      if (opened) void opened.loadingTask.destroy();
    };
  }, [fichier]);

  const title = card?.title.trim() || card?.fichier || "";
  return (
    <div className="document-viewer" aria-label={fmt(t.viewerAria, { title })}>
      <div className="document-viewer-head">
        <h2 id="app-dialog-title">{title}</h2>
        {state.kind === "ready" && (
          <span className="document-viewer-count">{state.doc.numPages === 1 ? t.onePage : fmt(t.pages, { n: state.doc.numPages })}</span>
        )}
        <form method="dialog">
          <button type="submit" className="ghost-button" autoFocus>
            {t.close}
          </button>
        </form>
      </div>
      <div className="document-viewer-pages">
        {state.kind === "loading" && <p className="sp-empty">{t.loading}</p>}
        {state.kind === "missing" && <p className="sp-empty">{t.missing}</p>}
        {state.kind === "failed" && <p className="sp-empty">{t.failed}</p>}
        {state.kind === "ready" && Array.from({ length: state.doc.numPages }, (_, i) => <PdfPage key={i} doc={state.doc} n={i + 1} label={fmt(t.pageAria, { n: i + 1 })} />)}
      </div>
    </div>
  );
}

/** Une page : un emplacement à la proportion A4 tant qu'elle n'est pas dessinée, puis son image. */
function PdfPage({ doc, n, label }: { doc: PdfDoc; n: number; label: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = holder.current;
    if (!el || drawn) return;
    const draw = () => {
      if (!canvas.current) return;
      const width = Math.min(820, el.clientWidth || 600);
      import("../pdfDocument")
        .then((pdf) => pdf.renderPage(doc, n, canvas.current!, width))
        .then(() => setDrawn(true))
        .catch((err) => console.error(err));
    };
    // Les pages se dessinent quand elles approchent de l'écran : un long PDF s'ouvre vite.
    if (typeof IntersectionObserver === "undefined") return draw();
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        draw();
      }
    }, { rootMargin: "600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [doc, n, drawn]);

  return (
    <div ref={holder} className={`document-page${drawn ? " is-drawn" : ""}`}>
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}
