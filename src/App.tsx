import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCosmos } from "./store";
import { TopBar } from "./components/TopBar";
import { Toile } from "./components/Toile";
import { Bible } from "./components/Bible";
import { Bientot } from "./components/Bientot";
import { ScreenplayView } from "./components/ScreenplayView";
import { Sequencier } from "./components/Sequencier";
import { useT } from "./i18n";

const AUTOSAVE_DELAY = 800; // ms après la dernière modification

export function App() {
  const t = useT();
  const view = useCosmos((s) => s.view);
  const kind = useCosmos((s) => s.kind);
  const loaded = useCosmos((s) => s.loaded);
  const openFailed = useCosmos((s) => s.openFailed);
  const dismissOpenFailed = useCosmos((s) => s.dismissOpenFailed);
  const load = useCosmos((s) => s.load);
  const save = useCosmos((s) => s.save);

  useEffect(() => {
    load();
  }, [load]);

  // Sauvegarde automatique : chaque modification relance le délai,
  // on enregistre quand l'auteur marque une pause.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useCosmos.subscribe((s, prev) => {
      if (!s.loaded || s.status !== "modifie") return;
      const same =
        s.nodes === prev.nodes && s.edges === prev.edges && s.screenplay === prev.screenplay && s.kind === prev.kind && s.paper === prev.paper;
      if (same && s.status === prev.status) return;
      clearTimeout(timer);
      timer = setTimeout(() => useCosmos.getState().save(), AUTOSAVE_DELAY);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // Cmd/Ctrl + S : sauvegarde immédiate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  if (!loaded) return <div className="loading">{t.app.loading}</div>;

  return (
    <ReactFlowProvider>
      <div className="app">
        <TopBar />
        {openFailed && (
          <div className="app-alert" role="alert">
            <span>{t.app.openFailed}</span>
            <button type="button" className="icon-button" aria-label={t.app.dismiss} onClick={dismissOpenFailed}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
        <main className="app-main">
          {view === "toile" && <Toile />}
          {view === "bible" && <Bible />}
          {view === "plan" && (kind === "scenario" ? <Sequencier /> : <Bientot view="plan" />)}
          {/* Même vue, deux ateliers : prose pour un roman (à venir), format cinéma pour un scénario. */}
          {view === "manuscrit" && (kind === "scenario" ? <ScreenplayView /> : <Bientot view="manuscrit" />)}
        </main>
      </div>
    </ReactFlowProvider>
  );
}
