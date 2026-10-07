// Vues prévues mais pas encore construites (voir la feuille de route dans CLAUDE.md).

import { useVocab } from "../vocab";

export function Bientot({ view }: { view: "plan" | "manuscrit" }) {
  const t = useVocab().soon;
  const [title, body] = view === "plan" ? [t.planTitle, t.planBody] : [t.manuscritTitle, t.manuscritBody];
  return (
    <div className="empty-view">
      <h1>{title}</h1>
      <p>{body}</p>
    </div>
  );
}
