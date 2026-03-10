import type { ChunkingConfig } from "./goodmem-client.js";

export const CHUNKING_PRESETS: Record<string, ChunkingConfig> = {
  "short-docs": { recursive: { chunkSize: 500, chunkOverlap: 100 } },
  "long-docs": { recursive: { chunkSize: 1000, chunkOverlap: 200 } },
  "mixed": { recursive: { chunkSize: 800, chunkOverlap: 150 } },
  "code-heavy": {
    recursive: {
      chunkSize: 600,
      chunkOverlap: 120,
      separators: ["\n\n", "\n", ". ", " "],
    },
  },
};

export function resolveChunkingConfig(
  preset?: string,
  custom?: ChunkingConfig
): ChunkingConfig {
  if (custom) return custom;
  if (preset && preset in CHUNKING_PRESETS) return CHUNKING_PRESETS[preset];
  return CHUNKING_PRESETS["mixed"];
}
