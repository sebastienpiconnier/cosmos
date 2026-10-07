import { useCosmos, type View } from "../store";
import { storage } from "../storage";
import { useT } from "../i18n";
import { Settings } from "./Settings";

const VIEWS: View[] = ["toile", "plan", "bible", "manuscrit"];
const READY: Record<View, boolean> = { toile: true, plan: false, bible: true, manuscrit: false };

export function TopBar() {
  const t = useT();
  const { view, setView, status, save, openFolder } = useCosmos();

  const location =
    storage.kind === "browser"
      ? t.location.browser
      : !storage.canPickFolder
        ? t.location.device
        : storage.location();

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

      <nav className="views" aria-label={t.views.aria}>
        <span className="views-pole">{t.views.chaos}</span>
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            className={view === v ? "is-current" : ""}
            aria-current={view === v ? "page" : undefined}
            title={READY[v] ? undefined : t.views.soon}
            onClick={() => setView(v)}
          >
            {t.views[v]}
          </button>
        ))}
        <span className="views-pole">{t.views.order}</span>
      </nav>

      <div className="actions">
        <span className={`status status-${status}`} role="status">
          {t.status[status]}
        </span>
        {storage.canPickFolder && (
          <button type="button" className="ghost-button" onClick={openFolder}>
            {t.actions.openFolder}
          </button>
        )}
        <button type="button" className="ghost-button" onClick={save}>
          {t.actions.save}
        </button>
        <Settings />
      </div>
    </header>
  );
}
