import { ChunkingConfig } from "./goodmem-client.js";

export interface ChunkingPreset {
  name: string;
  description: string;
  config: ChunkingConfig;
}

export const CHUNKING_PRESETS: Record<string, ChunkingPreset> = {
  "short-docs": {
    name: "short-docs",
    description: "Small chunks for short documents, READMEs, and concise notes",
    config: {
      recursive: {
        chunkSize: 500,
        chunkOverlap: 100,
      },
    },
  },
  "long-docs": {
    name: "long-docs",
    description: "Larger chunks for long-form documentation and articles",
    config: {
      recursive: {
        chunkSize: 2000,
        chunkOverlap: 400,
      },
    },
  },
  mixed: {
    name: "mixed",
    description: "Balanced chunking for mixed content types (default)",
    config: {
      recursive: {
        chunkSize: 1000,
        chunkOverlap: 200,
      },
    },
  },
  "code-heavy": {
    name: "code-heavy",
    description: "Optimized for source code with larger chunks and less overlap",
    config: {
      recursive: {
        chunkSize: 1500,
        chunkOverlap: 150,
      },
    },
  },
};

export function resolveChunkingConfig(
  presetName?: string,
  customConfig?: ChunkingConfig
): ChunkingConfig {
  if (customConfig) {
    return customConfig;
  }
  const name = presetName ?? "mixed";
  const preset = CHUNKING_PRESETS[name];
  if (!preset) {
    return CHUNKING_PRESETS["mixed"].config;
  }
  return preset.config;
}
