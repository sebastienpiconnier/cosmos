// Lire une page web à la demande de l'auteur (titre, site, auteur d'une source). Dans l'app, la requête
// passe par le plugin HTTP de Tauri (pas de CORS) ; dans le navigateur, la plupart des sites refusent.
// Rien ne part sans un clic : c'est le bouton « Compléter depuis la page » d'une carte Source.

import { isTauri } from "./platform";
import { pageInfo } from "./research";

const TIMEOUT_MS = 20_000;
const MAX_BYTES = 2_000_000;

export async function readPage(url: string): Promise<ReturnType<typeof pageInfo>> {
  if (!/^https?:\/\//i.test(url)) throw new Error("adresse");
  const doFetch: typeof fetch = isTauri() ? ((await import("@tauri-apps/plugin-http")).fetch as typeof fetch) : fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await doFetch(url, { method: "GET", headers: { accept: "text/html" }, signal: controller.signal });
    if (!response.ok) throw new Error(String(response.status));
    const html = (await response.text()).slice(0, MAX_BYTES);
    return pageInfo(html);
  } finally {
    clearTimeout(timer);
  }
}
