// Gravures de Gustave Doré du projet d'exemple (domaine public), chargées seulement à sa création :
// elles n'entrent pas dans le paquet de démarrage. Importées en `?inline` (adresses data:), donc
// sans requête réseau, ce que la CSP de l'app de bureau refuserait.

import foret from "./assets/demo/foret.jpg?inline";
import lit from "./assets/demo/lit.jpg?inline";
import mereGrand from "./assets/demo/mere-grand.jpg?inline";
import { DEMO_IMAGES } from "./demo";

/** Octets d'une adresse data: en base64. */
function bytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Fichiers à écrire dans medias/ : nom → octets. */
export function demoMedia(): [string, Uint8Array][] {
  return [
    [DEMO_IMAGES.foret, bytes(foret)],
    [DEMO_IMAGES.lit, bytes(lit)],
    [DEMO_IMAGES.mereGrand, bytes(mereGrand)],
  ];
}
