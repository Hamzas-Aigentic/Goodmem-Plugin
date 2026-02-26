import path from "node:path";

export interface GoodmemConfig {
  apiUrl: string;
  apiKey: string;
  spaceId: string | undefined;
  projectName: string;
  tlsRejectUnauthorized: boolean;
  openaiApiKey: string | undefined;
  openrouterApiKey: string | undefined;
}

let resolvedSpaceId: string | null = null;

export function setResolvedSpaceId(id: string): void {
  resolvedSpaceId = id;
}

export function getResolvedSpaceId(): string | null {
  return resolvedSpaceId;
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
  };
}
