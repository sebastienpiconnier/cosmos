import { useCosmos, type View } from "../store";
import { useVocab } from "../vocab";
import { Settings } from "./Settings";
import { ExportMenu } from "./ExportMenu";
import { AiMenu } from "./AiMenu";
import { Search } from "./Search";
import { fmt } from "../i18n";
import { useSettings } from "../settings";
import { minutesFor, usePagination } from "./usePagination";

const VIEWS: View[] = ["toile", "plan", "bible", "manuscrit"];

export function TopBar() {
  const { t, views, kind } = useVocab();
  const lang = useSettings((s) => s.lang);
  const pagination = usePagination();
  const pages = kind === "scenario" ? (pagination?.pages ?? 0) : 0;
  const pageCount = fmt(new Intl.PluralRules(lang).select(pages) === "one" ? t.screenplay.pagesOne : t.screenplay.pagesMany, { n: pages });
  const { view, setView, status, save, closeProject, title, setTitle } = useCosmos();

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M19 5l-2.5 2.5M7.5 16.5L5 19" />
        </svg>
        <span className="brand-name">Cosmos</span>
        {/* Le titre se change ici, directement. */}
        <input
          className="brand-project"
          type="text"
          value={title}
          size={Math.max(8, title.length)}
          placeholder={t.home.untitled}
          aria-label={t.app.projectTitle}
          title={t.app.projectTitle}
          autoComplete="off"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
        />
      </div>

      <nav className="views" aria-label={t.views.aria}>
        <span className="views-pole">{t.views.chaos}</span>
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            className={view === v ? "is-current" : ""}
            aria-current={view === v ? "page" : undefined}
            onClick={() => setView(v)}
          >
            {views[v]}
          </button>
        ))}
        <span className="views-pole">{t.views.order}</span>
      </nav>

      <div className="actions">
        {/* Toujours là pour un scénario, même vide : la barre ne bouge pas quand le texte arrive. */}
        {kind === "scenario" && pagination && (
          <span className="runtime" aria-label={t.screenplay.lengthAria}>
            <strong>{fmt(t.screenplay.minutes, { n: minutesFor(pages) })}</strong>
            <span>{pageCount}</span>
          </span>
        )}
        {/* Tous les libellés sont empilés (un seul visible) : la largeur ne change pas d'un statut à
            l'autre, donc rien ne bouge dans la barre pendant un enregistrement. */}
        <span className={`status status-${status}`}>
          {(Object.keys(t.status) as (keyof typeof t.status)[]).map((key) => (
            <span key={key} aria-hidden={key !== status} className={key === status ? "is-current" : undefined}>
              {t.status[key]}
            </span>
          ))}
          <span className="sr-only" role="status">
            {t.status[status]}
          </span>
        </span>
        <button type="button" className="ghost-button" title={t.home.backHint} onClick={() => closeProject()}>
          {t.home.projects}
        </button>
        {/* En icône : la barre porte déjà le statut, et l'enregistrement est automatique. */}
        <button type="button" className="icon-button" aria-label={t.actions.save} title={t.actions.saveHint} onClick={save}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
            <path d="M8 4v5h7V4M8 20v-6h8v6" />
          </svg>
        </button>
        <AiMenu />
        <ExportMenu />
        <Search />
        <Settings />
      </div>
    </header>
  );
}
