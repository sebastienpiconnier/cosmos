// Vues prévues mais pas encore construites (voir la feuille de route dans CLAUDE.md).

const TEXT: Record<"plan" | "manuscrit", { title: string; body: string }> = {
  plan: {
    title: "Plan, bientôt",
    body: "Les scènes de la toile se glisseront dans un gabarit (Save the Cat, trois actes, voyage du héros) et une chronologie par intrigue.",
  },
  manuscrit: {
    title: "Manuscrit, bientôt",
    body: "Un éditeur focus par scène, avec en marge les fiches des personnages et lieux détectés dans le texte.",
  },
};

export function Bientot({ view }: { view: "plan" | "manuscrit" }) {
  const t = TEXT[view];
  return (
    <div className="empty-view">
      <h1>{t.title}</h1>
      <p>{t.body}</p>
    </div>
  );
}
