// Vocabulaire selon la nature du projet (roman ou scénario).
// Fichier à part pour éviter un import circulaire entre i18n et store.

import { useMemo } from "react";
import { useT, type Messages } from "./i18n";
import { useCosmos } from "./store";
import type { ProjectKind } from "./types";

export function vocab(t: Messages, kind: ProjectKind) {
  if (kind === "roman") return { types: t.types, views: t.views, soon: t.soon };
  return {
    types: { ...t.types, ...t.scenario.types },
    views: { ...t.views, ...t.scenario.views },
    soon: t.scenario.soon,
  };
}

export type Vocab = ReturnType<typeof vocab>;

/** Textes d'interface + vocabulaire du projet courant. */
export function useVocab(): Vocab & { t: Messages; kind: ProjectKind } {
  const t = useT();
  const kind = useCosmos((s) => s.kind);
  return useMemo(() => ({ ...vocab(t, kind), t, kind }), [t, kind]);
}
