import { useCosmos, type View } from "../store";
import { useVocab } from "../vocab";
import { Settings } from "./Settings";
import { ExportMenu } from "./ExportMenu";
import { fmt } from "../i18n";
import { useSettings } from "../settings";
import { minutesFor, usePagination } from "./usePagination";

const VIEWS: View[] = ["toile", "plan", "bible", "manuscrit"];
const READY: Record<View, boolean> = { toile: true, plan: false, bible: true, manuscrit: false };

export function TopBar() {
  const { t, views, kind } = useVocab();
  // Un scénario a son séquencier et son éditeur ; le plan et le manuscrit du roman pas encore.
  const ready = (v: View) => READY[v] || kind === "scenario";
  const lang = useSettings((s) => s.lang);
  const pagination = usePagination();
  const pages = kind === "scenario" ? (pagination?.pages ?? 0) : 0;
  const pageCount = fmt(new Intl.PluralRules(lang).select(pages) === "one" ? t.screenplay.pagesOne : t.screenplay.pagesMany, { n: pages });
  const { view, setView, status, save, closeProject, title } = useCosmos();

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M19 5l-2.5 2.5M7.5 16.5L5 19" />
        </svg>
        <span className="brand-name">Cosmos</span>
        {title && <span className="brand-project">{title}</span>}
      </div>

      <nav className="views" aria-label={t.views.aria}>
        <span className="views-pole">{t.views.chaos}</span>
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            className={view === v ? "is-current" : ""}
            aria-current={view === v ? "page" : undefined}
            title={ready(v) ? undefined : t.views.soon}
            onClick={() => setView(v)}
          >
            {views[v]}
          </button>
        ))}
        <span className="views-pole">{t.views.order}</span>
      </nav>

      <div className="actions">
        {pages > 0 && (
          <span className="runtime" aria-label={t.screenplay.lengthAria}>
            <strong>{fmt(t.screenplay.minutes, { n: minutesFor(pages) })}</strong>
            <span>{pageCount}</span>
          </span>
        )}
        <span className={`status status-${status}`} role="status">
          {t.status[status]}
        </span>
        <button type="button" className="ghost-button" title={t.home.backHint} onClick={() => closeProject()}>
          {t.home.projects}
        </button>
        <button type="button" className="ghost-button" onClick={save}>
          {t.actions.save}
        </button>
        {kind === "scenario" && pagination && <ExportMenu />}
        <Settings />
      </div>
    </header>
  );
}
