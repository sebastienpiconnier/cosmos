import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCosmos } from "./store";
import { TopBar } from "./components/TopBar";
import { Toile } from "./components/Toile";
import { Bible } from "./components/Bible";
import { Bientot } from "./components/Bientot";

const AUTOSAVE_DELAY = 800; // ms après la dernière modification

export function App() {
  const view = useCosmos((s) => s.view);
  const loaded = useCosmos((s) => s.loaded);
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
      if (s.nodes === prev.nodes && s.edges === prev.edges && s.status === prev.status) return;
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

  if (!loaded) return <div className="loading">Ouverture du projet…</div>;

  return (
    <ReactFlowProvider>
      <div className="app">
        <TopBar />
        <main className="app-main">
          {view === "toile" && <Toile />}
          {view === "bible" && <Bible />}
          {(view === "plan" || view === "manuscrit") && <Bientot view={view} />}
        </main>
      </div>
    </ReactFlowProvider>
  );
}
