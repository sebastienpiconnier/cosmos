// Plan d'un roman : les cartes Scène rangées dans les cases d'un gabarit (trois actes, Save the Cat,
// voyage du héros) ou dans une simple liste ordonnée. Fonctions pures.
//
// Le plan ne contient que des identifiants de cartes : le titre et le texte d'une scène restent
// dans sa carte. Dans cosmos.json (champ `plan`, facultatif) :
//   { "template": "troisActes", "beats": { "a_setup": ["k3x9a7bq2m", …], … } }
// Les clés des cases sont propres à chaque gabarit : changer de gabarit ne perd donc aucun rangement,
// celui du gabarit précédent reste dans le fichier et revient si l'on y retourne.

export type PlanTemplate = "libre" | "troisActes" | "saveTheCat" | "voyageHeros" | "huitSequences" | "episode";

/** Cases de chaque gabarit, dans l'ordre du récit. Ces clés sont écrites dans le fichier : ne jamais les renommer. */
export const PLAN_TEMPLATES = {
  libre: ["libre"],
  troisActes: ["a_setup", "a_incident", "a_confrontation", "a_midpoint", "a_crisis", "a_climax", "a_resolution"],
  saveTheCat: [
    "c_opening", "c_theme", "c_setup", "c_catalyst", "c_debate", "c_act2", "c_bstory", "c_fun",
    "c_midpoint", "c_badguys", "c_lost", "c_darknight", "c_act3", "c_finale", "c_final",
  ],
  voyageHeros: [
    "h_ordinary", "h_call", "h_refusal", "h_mentor", "h_threshold", "h_tests",
    "h_approach", "h_ordeal", "h_reward", "h_road", "h_resurrection", "h_return",
  ],
  // Gabarits de scénario (séquencier, voir screenplay/template.ts).
  huitSequences: ["q_1", "q_2", "q_3", "q_4", "q_5", "q_6", "q_7", "q_8"],
  episode: ["e_teaser", "e_act1", "e_act2", "e_act3", "e_act4", "e_tag"],
} as const satisfies Record<PlanTemplate, readonly string[]>;

export type PlanBeat = (typeof PLAN_TEMPLATES)[PlanTemplate][number];

export const PLAN_TEMPLATE_KEYS = Object.keys(PLAN_TEMPLATES) as PlanTemplate[];
/** Gabarits proposés pour un roman, dans l'ordre du menu. */
export const NOVEL_TEMPLATES = ["libre", "troisActes", "saveTheCat", "voyageHeros"] as const satisfies readonly PlanTemplate[];
export const isPlanTemplate = (v: unknown): v is PlanTemplate => typeof v === "string" && v in PLAN_TEMPLATES;

export interface Plan {
  template: PlanTemplate;
  /** Scènes de chaque case, dans l'ordre. Peut contenir les cases d'autres gabarits. */
  beats: Record<string, string[]>;
}

export const EMPTY_PLAN: Plan = { template: "libre", beats: {} };

/** Plan lu dans cosmos.json : tout ce qui n'a pas la bonne forme est ignoré. */
export function readPlan(raw: unknown): Plan {
  if (!raw || typeof raw !== "object") return EMPTY_PLAN;
  const { template, beats } = raw as { template?: unknown; beats?: unknown };
  const clean: Record<string, string[]> = {};
  if (beats && typeof beats === "object" && !Array.isArray(beats)) {
    for (const [key, ids] of Object.entries(beats)) {
      if (!Array.isArray(ids)) continue;
      const list = [...new Set(ids.filter((id): id is string => typeof id === "string" && id !== ""))];
      if (list.length > 0) clean[key] = list;
    }
  }
  const next: Plan = { template: isPlanTemplate(template) ? template : "libre", beats: clean };
  return isEmptyPlan(next) ? EMPTY_PLAN : next;
}

/** Rien à écrire dans le fichier : gabarit par défaut et aucune scène rangée. */
export const isEmptyPlan = (plan: Plan) => plan.template === "libre" && Object.values(plan.beats).every((ids) => ids.length === 0);

/** Plan à écrire : sans les cartes qui n'existent plus ni les cases vides. Même objet si rien ne change. */
export function prunePlan(plan: Plan, existing: Set<string>): Plan {
  let changed = false;
  const beats: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(plan.beats)) {
    const kept = ids.filter((id) => existing.has(id));
    if (kept.length !== ids.length || kept.length === 0) changed = true;
    if (kept.length > 0) beats[key] = kept;
  }
  return changed ? { ...plan, beats } : plan;
}

export interface Arranged {
  /** Cases du gabarit courant, avec leurs scènes. */
  beats: { key: string; ids: string[] }[];
  /** Scènes pas encore rangées, dans l'ordre reçu. */
  unplaced: string[];
}

/**
 * Lecture du plan pour le gabarit courant. `sceneIds` : les cartes Scène du projet, dans un ordre
 * par défaut (celui du canevas). Une scène n'apparaît qu'une fois ; une carte qui n'est plus une
 * scène n'apparaît pas. Plan libre : une seule liste, où les scènes pas encore rangées viennent à la suite.
 */
export function arrange(plan: Plan, sceneIds: string[]): Arranged {
  const scenes = new Set(sceneIds);
  const seen = new Set<string>();
  const beats = PLAN_TEMPLATES[plan.template].map((key) => ({
    key,
    ids: (plan.beats[key] ?? []).filter((id) => scenes.has(id) && !seen.has(id) && !!seen.add(id)),
  }));
  const unplaced = sceneIds.filter((id) => !seen.has(id));
  if (plan.template === "libre") return { beats: [{ key: "libre", ids: [...beats[0].ids, ...unplaced] }], unplaced: [] };
  return { beats, unplaced };
}

/** Les scènes dans l'ordre du récit : cases du gabarit, puis scènes pas encore rangées. */
export function planOrder(plan: Plan, sceneIds: string[]): string[] {
  const { beats, unplaced } = arrange(plan, sceneIds);
  return [...beats.flatMap((b) => b.ids), ...unplaced];
}

/** Réécrit les cases du gabarit courant ; celles des autres gabarits ne bougent pas. */
function withBeats(plan: Plan, beats: Arranged["beats"]): Plan {
  const next = { ...plan.beats };
  for (const { key, ids } of beats) {
    if (ids.length > 0) next[key] = ids;
    else delete next[key];
  }
  return { ...plan, beats: next };
}

/**
 * Range une scène dans une case (à la fin, ou à la position donnée), ou la sort du plan (`beat` null).
 * Même objet si rien ne change.
 */
export function placeScene(plan: Plan, sceneIds: string[], id: string, beat: string | null, index?: number): Plan {
  if (!sceneIds.includes(id)) return plan;
  const current = arrange(plan, sceneIds);
  if (beat !== null && !current.beats.some((b) => b.key === beat)) return plan;
  // Plan libre : pas de « à placer », toutes les scènes sont dans la liste.
  if (beat === null && plan.template === "libre") return plan;
  const from = current.beats.find((b) => b.ids.includes(id));
  const fromIndex = from ? from.ids.indexOf(id) : -1;
  const beats = current.beats.map((b) => ({ key: b.key, ids: b.ids.filter((x) => x !== id) }));
  if (beat !== null) {
    const target = beats.find((b) => b.key === beat)!;
    const same = from?.key === beat;
    // La position visée se lit dans la liste d'avant, qui comptait encore la scène si elle était déjà dans la case.
    let at = index === undefined ? target.ids.length : Math.max(0, Math.min(index, target.ids.length + (same ? 1 : 0)));
    if (same && index !== undefined && fromIndex < at) at -= 1;
    if (from?.key === beat && at === fromIndex) return plan;
    target.ids.splice(at, 0, id);
  } else if (!from) {
    return plan;
  }
  return withBeats(plan, beats);
}

/**
 * Monte ou descend une scène d'un cran dans le récit. Au bord d'une case, elle passe dans la case
 * voisine (à la fin de la précédente, au début de la suivante). Même objet si elle ne peut pas bouger.
 */
export function stepScene(plan: Plan, sceneIds: string[], id: string, way: "up" | "down"): Plan {
  const { beats } = arrange(plan, sceneIds);
  const b = beats.findIndex((beat) => beat.ids.includes(id));
  if (b < 0) return plan;
  const i = beats[b].ids.indexOf(id);
  if (way === "up") {
    if (i > 0) return placeScene(plan, sceneIds, id, beats[b].key, i - 1);
    return b > 0 ? placeScene(plan, sceneIds, id, beats[b - 1].key) : plan;
  }
  if (i < beats[b].ids.length - 1) return placeScene(plan, sceneIds, id, beats[b].key, i + 2);
  return b < beats.length - 1 ? placeScene(plan, sceneIds, id, beats[b + 1].key, 0) : plan;
}

/** Change de gabarit. Les rangements de l'ancien restent dans le plan. */
export const setTemplate = (plan: Plan, template: PlanTemplate): Plan => (plan.template === template ? plan : { ...plan, template });
