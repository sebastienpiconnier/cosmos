// Services d'IA que l'auteur peut brancher (facultatif) : Claude, OpenAI, OpenRouter, ou un modèle local
// servi par Ollama ou LM Studio. Les requêtes partent directement de l'appareil vers le service choisi,
// uniquement quand l'auteur déclenche une action IA. La clé reste un réglage de l'appareil.

export type AiProvider = "anthropic" | "openai" | "openrouter" | "ollama" | "lmstudio";
export const AI_PROVIDERS: AiProvider[] = ["anthropic", "openai", "openrouter", "ollama", "lmstudio"];
export const isAiProvider = (v: unknown): v is AiProvider => AI_PROVIDERS.includes(v as AiProvider);

interface ProviderInfo {
  /** Service local : pas de clé, adresse modifiable, les textes ne quittent pas la machine. */
  local: boolean;
  /** Adresse de base par défaut (sans barre finale). */
  url: string;
  /** Modèle proposé par défaut ; vide : à choisir (la liste vient du service). */
  model: string;
}

export const PROVIDERS: Record<AiProvider, ProviderInfo> = {
  anthropic: { local: false, url: "https://api.anthropic.com", model: "claude-sonnet-5-5" },
  openai: { local: false, url: "https://api.openai.com", model: "" },
  openrouter: { local: false, url: "https://openrouter.ai/api", model: "openrouter/auto" },
  ollama: { local: true, url: "http://localhost:11434", model: "" },
  lmstudio: { local: true, url: "http://localhost:1234", model: "" },
};

export interface AiConfig {
  provider: AiProvider;
  /** Clé d'API (services en ligne). */
  key: string;
  model: string;
  /** Adresse du service local ; vide : adresse par défaut. */
  url: string;
}

/** Peut-on lancer une action IA avec ces réglages ? */
export function isReady(config: AiConfig | null): config is AiConfig {
  if (!config || !config.model.trim()) return false;
  return PROVIDERS[config.provider].local || config.key.trim() !== "";
}

const base = (config: AiConfig) => {
  const info = PROVIDERS[config.provider];
  const custom = info.local ? config.url.trim().replace(/\/+$/, "") : "";
  return custom || info.url;
};

export interface HttpRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
}

function headers(config: AiConfig): Record<string, string> {
  const key = config.key.trim();
  if (config.provider === "anthropic") {
    // L'en-tête d'accès direct autorise l'appel depuis une app sans serveur intermédiaire.
    return { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
  }
  const out: Record<string, string> = { "content-type": "application/json" };
  if (key && !PROVIDERS[config.provider].local) out.authorization = `Bearer ${key}`;
  if (config.provider === "openrouter") out["x-title"] = "Cosmos";
  return out;
}

/** Requête de complétion : une consigne (system) et un message de l'auteur (user). */
export function chatRequest(config: AiConfig, system: string, user: string, maxTokens = 1500): HttpRequest {
  const model = config.model.trim();
  if (config.provider === "anthropic") {
    return {
      url: `${base(config)}/v1/messages`,
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    };
  }
  return {
    url: `${base(config)}/v1/chat/completions`,
    method: "POST",
    headers: headers(config),
    body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  };
}

/** Texte de la réponse, quel que soit le service. Vide si la réponse n'a pas la forme attendue. */
export function readReply(provider: AiProvider, json: unknown): string {
  const data = json as { content?: { type?: string; text?: string }[]; choices?: { message?: { content?: unknown } }[] } | null;
  if (provider === "anthropic") {
    return (data?.content ?? []).filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("").trim();
  }
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

/** Liste des modèles du service (sert aussi à vérifier la clé ou que le serveur local répond). */
export function modelsRequest(config: AiConfig): HttpRequest {
  return { url: `${base(config)}/v1/models`, method: "GET", headers: headers(config) };
}

export function readModels(json: unknown): string[] {
  const data = (json as { data?: { id?: unknown }[] } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data.map((m) => m?.id).filter((id): id is string => typeof id === "string" && id !== "").sort((a, b) => a.localeCompare(b));
}

/** Ce qui a empêché une action IA, pour un message compréhensible. */
export type AiErrorCode = "network" | "auth" | "model" | "limit" | "empty" | "other";

export class AiError extends Error {
  constructor(public code: AiErrorCode, detail = "") {
    super(detail || code);
  }
}

export const errorCode = (status: number): AiErrorCode =>
  status === 401 || status === 403 ? "auth" : status === 404 || status === 400 ? "model" : status === 429 || status === 402 ? "limit" : "other";

const TIMEOUT_MS = 90_000;

async function send(request: HttpRequest): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body, signal: controller.signal });
  } catch (err) {
    // Serveur local éteint, pas de réseau, ou appel refusé par le service (CORS).
    throw new AiError("network", String(err));
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new AiError(errorCode(response.status), `${response.status} ${await response.text().catch(() => "")}`.slice(0, 300));
  return response.json().catch(() => {
    throw new AiError("other", "réponse illisible");
  });
}

/** Envoie une consigne et rend le texte de la réponse. */
export async function complete(config: AiConfig, system: string, user: string, maxTokens?: number): Promise<string> {
  const text = readReply(config.provider, await send(chatRequest(config, system, user, maxTokens)));
  if (!text) throw new AiError("empty");
  return text;
}

export async function listModels(config: AiConfig): Promise<string[]> {
  return readModels(await send(modelsRequest(config)));
}
