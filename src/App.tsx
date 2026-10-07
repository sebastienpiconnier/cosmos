import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCosmos } from "./store";
import { TopBar } from "./components/TopBar";
import { Toile } from "./components/Toile";
import { Bible } from "./components/Bible";
import { Bientot } from "./components/Bientot";
import { ScreenplayView } from "./components/ScreenplayView";
import { Sequencier } from "./components/Sequencier";
import { Home } from "./components/Home";
import { useT } from "./i18n";
import { storage } from "./storage";

const AUTOSAVE_DELAY = 800; // ms après la dernière modification

export function App() {
  const t = useT();
  const view = useCosmos((s) => s.view);
  const kind = useCosmos((s) => s.kind);
  const loaded = useCosmos((s) => s.loaded);
  const screen = useCosmos((s) => s.screen);
  const focusMode = useCosmos((s) => s.focusMode);
  const status = useCosmos((s) => s.status);
  const closeProject = useCosmos((s) => s.closeProject);
  const start = useCosmos((s) => s.start);
  const save = useCosmos((s) => s.save);

  // Au lancement : la liste des projets, puis l'accueil.
  useEffect(() => {
    start();
  }, [start]);

  // Sauvegarde automatique : chaque modification relance le délai,
  // on enregistre quand l'auteur marque une pause.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useCosmos.subscribe((s, prev) => {
      if (!s.loaded || s.screen !== "project" || s.status !== "modifie") return;
      const same =
        s.nodes === prev.nodes && s.frames === prev.frames && s.edges === prev.edges && s.screenplay === prev.screenplay && s.title === prev.title && s.kind === prev.kind && s.paper === prev.paper && s.sceneNumbers === prev.sceneNumbers;
      if (same && s.status === prev.status) return;
      clearTimeout(timer);
      timer = setTimeout(() => useCosmos.getState().save(), AUTOSAVE_DELAY);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // Cmd/Ctrl + S : sauvegarde immédiate. Cmd/Ctrl + Z, Maj + Z ou Y : annuler, rétablir.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || useCosmos.getState().screen !== "project") return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        save();
        return;
      }
      // Annuler / rétablir : dans un champ ou un éditeur, c'est leur propre historique qui répond.
      if (key !== "z" && key !== "y") return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      if (key === "y" || e.shiftKey) useCosmos.getState().redo();
      else useCosmos.getState().undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  if (!loaded) return <div className="loading">{t.app.loading}</div>;
  if (screen === "home") return <Home />;

  return (
    <ReactFlowProvider>
      <div className="app">
        {/* Mode focus du scénario : la barre du haut s'efface, la feuille prend la place. */}
        {!(focusMode && view === "manuscrit" && kind === "scenario") && <TopBar />}
        {status === "erreur" && (
          <div className="app-alert" role="alert">
            <span>{storage.canPickFolder ? t.app.saveFailedFolder : t.app.saveFailed}</span>
            <span className="app-alert-actions">
              <button type="button" className="ghost-button" onClick={save}>
                {t.app.retry}
              </button>
              <button type="button" className="ghost-button" onClick={() => closeProject(true)}>
                {t.app.leaveUnsaved}
              </button>
            </span>
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
