// Vues prévues mais pas encore construites (voir la feuille de route dans CLAUDE.md).

import { useT } from "../i18n";

export function Bientot({ view }: { view: "plan" | "manuscrit" }) {
  const t = useT().soon;
  const [title, body] = view === "plan" ? [t.planTitle, t.planBody] : [t.manuscritTitle, t.manuscritBody];
  return (
    <div className="empty-view">
      <h1>{title}</h1>
      <p>{body}</p>
    </div>
  );
}
