import { useCosmos, type View } from "../store";
import { useVocab } from "../vocab";
import { Settings } from "./Settings";
import { ExportMenu } from "./ExportMenu";
import { AiMenu } from "./AiMenu";
import { Search } from "./Search";
import { TodoPanel } from "./TodoPanel";
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
        {/* Une constellation : des étoiles éparses, quelques-unes reliées, une qui brille. Comme l'icône de l'app. */}
        <svg className="brand-mark" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
          <g fill="currentColor" opacity="0.45">
            <circle cx="4.2" cy="5" r="0.7" />
            <circle cx="12.5" cy="3.6" r="0.55" />
            <circle cx="19.6" cy="20" r="0.6" />
          </g>
          <path d="M4.5 16.8L8.5 10.9L12.6 13.3L16.3 7.6M12.6 13.3L16.8 17.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <g fill="currentColor">
            <circle cx="4.5" cy="16.8" r="1.5" />
            <circle cx="8.5" cy="10.9" r="1.8" />
            <circle cx="12.6" cy="13.3" r="1.6" />
            <circle cx="16.8" cy="17.6" r="1.4" />
            <path d="M16.3 3.2C16.6 5.6 17.4 6.4 19.8 6.7C17.4 7 16.6 7.8 16.3 10.2C16 7.8 15.2 7 12.8 6.7C15.2 6.4 16 5.6 16.3 3.2Z" />
          </g>
        </svg>
        {/* Le nom et le slogan du projet (celui du README) : « du chaos au monde ordonné ». */}
        <span className="brand-text">
          <span className="brand-name">Cosmos</span>
          <span className="brand-tagline">{t.app.tagline}</span>
        </span>
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
        <TodoPanel />
        <Search />
        <Settings />
      </div>
    </header>
  );
}
