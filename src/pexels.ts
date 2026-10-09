// Recherche de photos sur Pexels (https://www.pexels.com/api/). La clé est celle de l'auteur, propre à
// l'appareil (réglages), jamais dans le projet. Dans l'app, la requête passe par le plugin HTTP de Tauri
// (pas de CORS) ; dans le navigateur, par fetch. La réponse n'est jamais crue sur parole : seules des
// adresses https de pexels.com sont gardées (les vignettes s'affichent, l'image choisie est téléchargée).

import { isTauri } from "./platform";

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  /** Page de la photo sur pexels.com (crédit et licence). */
  page: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
  /** Vignette pour la grille de résultats. */
  thumb: string;
  /** Image téléchargée dans medias/ (environ 940 px de large). */
  image: string;
}

export interface PexelsPage {
  photos: PexelsPhoto[];
  total: number;
  /** Une page suivante existe. */
  more: boolean;
}

export type PexelsError = "key" | "limit" | "network";

const isHttps = (value: unknown, host: RegExp): value is string => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && host.test(url.hostname);
  } catch {
    return false;
  }
};
const IMAGES = /^images\.pexels\.com$/;
const SITE = /^(www\.)?pexels\.com$/;

/** Réponse de /v1/search : seulement des photos complètes, aux adresses attendues. */
export function parsePexels(raw: unknown): PexelsPage {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(data.photos) ? data.photos : [];
  const photos: PexelsPhoto[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const src = (p.src && typeof p.src === "object" ? p.src : {}) as Record<string, unknown>;
    const thumb = isHttps(src.medium, IMAGES) ? src.medium : isHttps(src.small, IMAGES) ? src.small : null;
    const image = isHttps(src.large, IMAGES) ? src.large : isHttps(src.original, IMAGES) ? src.original : null;
    if (typeof p.id !== "number" || !thumb || !image) continue;
    photos.push({
      id: p.id,
      width: typeof p.width === "number" ? p.width : 0,
      height: typeof p.height === "number" ? p.height : 0,
      page: isHttps(p.url, SITE) ? p.url : `https://www.pexels.com/photo/${p.id}/`,
      photographer: typeof p.photographer === "string" ? p.photographer.trim().slice(0, 120) : "",
      photographerUrl: isHttps(p.photographer_url, SITE) ? p.photographer_url : "",
      alt: typeof p.alt === "string" ? p.alt.trim().slice(0, 300) : "",
      thumb,
      image,
    });
  }
  const total = typeof data.total_results === "number" ? data.total_results : photos.length;
  return { photos, total, more: typeof data.next_page === "string" && data.next_page.length > 0 };
}

/** Langue de recherche Pexels pour la langue de l'interface (les mots-clés de l'auteur sont dans sa langue). */
export const pexelsLocale = (lang: string) => (lang === "fr" ? "fr-FR" : lang === "de" ? "de-DE" : lang === "es" ? "es-ES" : lang === "it" ? "it-IT" : "en-US");

export const PER_PAGE = 24;

/** Une page de résultats. Lève une erreur dont le message est un PexelsError. */
export async function searchPexels(key: string, query: string, page: number, lang: string): Promise<PexelsPage> {
  const url = `https://api.pexels.com/v1/search?${new URLSearchParams({ query, page: String(page), per_page: String(PER_PAGE), locale: pexelsLocale(lang) })}`;
  const doFetch: typeof fetch = isTauri() ? ((await import("@tauri-apps/plugin-http")).fetch as typeof fetch) : fetch;
  let response: Response;
  // Sans réponse au bout de 20 s, on abandonne : la recherche ne reste pas suspendue.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    response = await doFetch(url, { method: "GET", headers: { Authorization: key }, signal: controller.signal });
  } catch {
    throw new Error("network" satisfies PexelsError);
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 401 || response.status === 403) throw new Error("key" satisfies PexelsError);
  if (response.status === 429) throw new Error("limit" satisfies PexelsError);
  if (!response.ok) throw new Error("network" satisfies PexelsError);
  return parsePexels(await response.json());
}
