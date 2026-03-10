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

export interface GoodmemPersistedConfig {
  spaceId?: string;
  rerankerId?: string;
  llmId?: string;
  embedderId?: string;
  chunkingPreset?: string;
}

const PERSISTED_CONFIG_FILE = ".goodmem.json";

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

export function loadPersistedConfig(): GoodmemPersistedConfig | null {
  try {
    const filePath = path.join(process.cwd(), PERSISTED_CONFIG_FILE);
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as GoodmemPersistedConfig;
  } catch {
    return null;
  }
}

export function savePersistedConfig(config: GoodmemPersistedConfig): void {
  const filePath = path.join(process.cwd(), PERSISTED_CONFIG_FILE);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
}

export function getEffectiveSpaceId(): string | null {
  const envSpaceId = process.env.GOODMEM_SPACE_ID;
  if (envSpaceId) return envSpaceId;

  const persisted = loadPersistedConfig();
  if (persisted?.spaceId) return persisted.spaceId;

  return resolvedSpaceId;
}

export function getEffectiveRerankerId(): string | null {
  const persisted = loadPersistedConfig();
  if (persisted?.rerankerId) return persisted.rerankerId;

  return resolvedRerankerId;
}

export function getEffectiveLlmId(): string | null {
  const persisted = loadPersistedConfig();
  if (persisted?.llmId) return persisted.llmId;

  return resolvedLlmId;
}

export function getEffectiveEmbedderId(): string | null {
  const persisted = loadPersistedConfig();
  if (persisted?.embedderId) return persisted.embedderId;

  return resolvedEmbedderId;
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
