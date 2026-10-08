// Photo d'une fiche préparée pour une IA qui lit les images : réduite (1 024 px au plus grand côté) et
// réencodée en JPEG, en base64. Lue par une balise <img> plutôt que par fetch : l'adresse blob: d'une
// image est permise pour les images par la CSP de l'app, pas pour les requêtes.

export interface AiImage {
  /** Type MIME (toujours image/jpeg ici). */
  mime: string;
  /** Contenu en base64, sans préfixe data:. */
  data: string;
}

export const MAX_SIDE = 1024;

/** Dimensions réduites pour que le plus grand côté tienne dans `max` (jamais agrandies). */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function imageForAi(url: string): Promise<AiImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ mime: "image/jpeg", data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "" });
    };
    img.onerror = () => reject(new Error("image illisible"));
    img.src = url;
  });
}
