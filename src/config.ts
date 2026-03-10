import path from "node:path";
import fs from "node:fs";

export interface GoodmemConfig {
  apiUrl: string;
  apiKey: string;
  spaceId: string | undefined;
  projectName: string;
  tlsRejectUnauthorized: boolean;
  openaiApiKey: string | undefined;
  openrouterApiKey: string | undefined;
  cohereApiKey: string | undefined;
}

export interface PersistedConfig {
  spaceId?: string;
  rerankerId?: string;
  llmId?: string;
  embedderId?: string;
  chunkingPreset?: string;
}

const CONFIG_FILE = ".goodmem.json";

let resolvedSpaceId: string | null = null;
let resolvedRerankerId: string | null = null;
let resolvedLlmId: string | null = null;
let resolvedEmbedderId: string | null = null;

export function setResolvedSpaceId(id: string): void {
  resolvedSpaceId = id;
}

export function getResolvedSpaceId(): string | null {
  return resolvedSpaceId;
}

export function setResolvedRerankerId(id: string): void {
  resolvedRerankerId = id;
}

export function getResolvedRerankerId(): string | null {
  return resolvedRerankerId;
}

export function setResolvedLlmId(id: string): void {
  resolvedLlmId = id;
}

export function getResolvedLlmId(): string | null {
  return resolvedLlmId;
}

export function setResolvedEmbedderId(id: string): void {
  resolvedEmbedderId = id;
}

export function getResolvedEmbedderId(): string | null {
  return resolvedEmbedderId;
}

export function loadPersistedConfig(): PersistedConfig | null {
  const filePath = path.join(process.cwd(), CONFIG_FILE);
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as PersistedConfig;
  } catch {
    return null;
  }
}

export function savePersistedConfig(config: PersistedConfig): void {
  const filePath = path.join(process.cwd(), CONFIG_FILE);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function getEffectiveSpaceId(): string | undefined {
  // Resolution chain: env var > persisted config > runtime state
  const envSpaceId = process.env.GOODMEM_SPACE_ID;
  if (envSpaceId) return envSpaceId;

  const persisted = loadPersistedConfig();
  if (persisted?.spaceId) return persisted.spaceId;

  if (resolvedSpaceId) return resolvedSpaceId;

  return undefined;
}

export function getConfig(): GoodmemConfig {
  const apiKey = process.env.GOODMEM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOODMEM_API_KEY environment variable is required. " +
        "Set it to your Goodmem API key."
    );
  }

  return {
    apiUrl: process.env.GOODMEM_API_URL || "https://localhost:8080",
    apiKey,
    spaceId: process.env.GOODMEM_SPACE_ID || undefined,
    projectName:
      process.env.GOODMEM_PROJECT_NAME || path.basename(process.cwd()),
    tlsRejectUnauthorized:
      process.env.GOODMEM_TLS_REJECT_UNAUTHORIZED === "1",
    openaiApiKey: process.env.OPENAI_API_KEY || undefined,
    openrouterApiKey: process.env.OPENROUTER_API_KEY || undefined,
    cohereApiKey: process.env.COHERE_API_KEY || undefined,
  };
}
