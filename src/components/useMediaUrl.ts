// Adresse affichable d'une image de medias/ (lue une fois par session, puis gardée en mémoire).

import { useEffect, useState } from "react";
import { storage } from "../storage";

const cache = new Map<string, Promise<string | null>>();

/** À appeler quand on ouvre un autre projet : deux projets peuvent avoir un fichier du même nom. */
export const forgetMediaUrls = () => cache.clear();

export function useMediaUrl(name: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!name) return setUrl(null);
    let alive = true;
    let pending = cache.get(name);
    if (!pending) {
      pending = storage.mediaUrl(name).catch(() => null);
      cache.set(name, pending);
    }
    pending.then((value) => alive && setUrl(value));
    return () => {
      alive = false;
    };
  }, [name]);
  return name ? url : null;
}
