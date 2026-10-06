import { useCosmos, type SaveStatus, type View } from "../store";
import { storage } from "../storage";

const VIEWS: { view: View; label: string; ready: boolean }[] = [
  { view: "toile", label: "Toile", ready: true },
  { view: "plan", label: "Plan", ready: false },
  { view: "bible", label: "Bible", ready: true },
  { view: "manuscrit", label: "Manuscrit", ready: false },
];

const STATUS_LABEL: Record<SaveStatus, string> = {
  enregistre: "Enregistré",
  modifie: "Modifications non enregistrées",
  enregistrement: "Enregistrement…",
  erreur: "Erreur d'enregistrement",
};

export function TopBar() {
  const { view, setView, status, save, openFolder } = useCosmos();
  const location = storage.location();

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M19 5l-2.5 2.5M7.5 16.5L5 19" />
        </svg>
        <span className="brand-name">Cosmos</span>
        {location && <span className="brand-project">{location}</span>}
      </div>

      <nav className="views" aria-label="Vues du projet">
        <span className="views-pole">Chaos</span>
        {VIEWS.map((v) => (
          <button
            key={v.view}
            type="button"
            className={view === v.view ? "is-current" : ""}
            aria-current={view === v.view ? "page" : undefined}
            title={v.ready ? undefined : "Bientôt"}
            onClick={() => setView(v.view)}
          >
            {v.label}
          </button>
        ))}
        <span className="views-pole">Ordre</span>
      </nav>

      <div className="actions">
        <span className={`status status-${status}`} role="status">
          {STATUS_LABEL[status]}
        </span>
        {storage.kind === "tauri" && (
          <button type="button" className="ghost-button" onClick={openFolder}>
            Ouvrir un dossier
          </button>
        )}
        <button type="button" className="ghost-button" onClick={save}>
          Enregistrer
        </button>
      </div>
    </header>
  );
}
