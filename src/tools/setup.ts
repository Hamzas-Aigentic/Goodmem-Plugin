import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import {
  getConfig,
  getEffectiveSpaceId,
  savePersistedConfig,
  loadPersistedConfig,
  setResolvedSpaceId,
  setResolvedRerankerId,
  setResolvedLlmId,
  setResolvedEmbedderId,
} from "../config.js";
import { resolveChunkingConfig } from "../chunking-presets.js";

export function registerSetupTools(
  server: McpServer,
  client: GoodmemClient
): void {
  server.tool(
    "setup_space",
    "Initialize Goodmem for this project. Creates an embedding model configuration and memory space. Run this once per project before ingesting documents.",
    {
      projectName: z
        .string()
        .optional()
        .describe("Project name (defaults to current directory name)"),
      chunkingPreset: z
        .enum(["short-docs", "long-docs", "mixed", "code-heavy"])
        .optional()
        .describe("Chunking preset for document splitting"),
      chunkSize: z
        .number()
        .optional()
        .describe("Custom chunk size (overrides preset)"),
      chunkOverlap: z
        .number()
        .optional()
        .describe("Custom chunk overlap (overrides preset)"),
      autoRegisterReranker: z
        .boolean()
        .optional()
        .default(true)
        .describe("Auto-register Cohere reranker if COHERE_API_KEY is available"),
    },
    async ({ projectName, chunkingPreset, chunkSize, chunkOverlap, autoRegisterReranker }) => {
      const name = projectName ?? getConfig().projectName;

      // Check for existing space with matching name
      const spaces = await client.listSpaces();
      const existing = spaces.find((s) => s.name === name);
      if (existing) {
        setResolvedSpaceId(existing.spaceId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Found existing space '${name}' (ID: ${existing.spaceId})`,
            },
          ],
        };
      }

      // Find or create embedder
      const embedders = await client.listEmbedders();
      let embedder = embedders.find(
        (e) => e.displayName === "openai-text-embedding-3-small"
      );

      if (!embedder) {
        const config = getConfig();
        if (!config.openaiApiKey) {
          return {
            content: [
              {
                type: "text" as const,
                text: "OPENAI_API_KEY environment variable is required to create an embedder. Set it and restart.",
              },
            ],
            isError: true,
          };
        }

        embedder = await client.createEmbedder({
          displayName: "openai-text-embedding-3-small",
          providerType: "OPENAI",
          modelIdentifier: "text-embedding-3-small",
          dimensionality: 1536,
          distributionType: "DENSE",
          endpointUrl: "https://api.openai.com/v1",
          apiPath: "/embeddings",
          credentials: {
            apiKey: {
              inlineSecret: config.openaiApiKey,
            },
          },
        });
      }

      // Resolve chunking config
      const customChunking = (chunkSize !== undefined || chunkOverlap !== undefined)
        ? { recursive: { chunkSize: chunkSize ?? 800, chunkOverlap: chunkOverlap ?? 150 } }
        : undefined;
      const chunkingConfig = resolveChunkingConfig(chunkingPreset, customChunking);

      // Create space with the embedder
      const space = await client.createSpace({
        name,
        defaultChunkingConfig: chunkingConfig,
        spaceEmbedders: [{ embedderId: embedder.embedderId }],
      });

      setResolvedSpaceId(space.spaceId);
      setResolvedEmbedderId(embedder.embedderId);

      // Auto-register reranker if Cohere key is available
      let rerankerId: string | undefined;
      if (autoRegisterReranker) {
        const config = getConfig();
        if (config.cohereApiKey) {
          try {
            const rerankers = await client.listRerankers();
            const existingReranker = rerankers.find(r => r.displayName === "cohere-reranker");
            if (existingReranker) {
              rerankerId = existingReranker.rerankerId;
            } else {
              const reranker = await client.createReranker({
                displayName: "cohere-reranker",
                providerType: "COHERE",
                endpointUrl: "https://api.cohere.com",
                modelIdentifier: "rerank-english-v3.0",
                credentials: {
                  apiKey: {
                    inlineSecret: config.cohereApiKey,
                  },
                },
              });
              rerankerId = reranker.rerankerId;
            }
            setResolvedRerankerId(rerankerId);
          } catch {
            // Reranker registration failed — not critical, continue
          }
        }
      }

      // Persist config
      savePersistedConfig({
        spaceId: space.spaceId,
        embedderId: embedder.embedderId,
        ...(rerankerId !== undefined && { rerankerId }),
        ...(chunkingPreset !== undefined && { chunkingPreset }),
      });

      let resultText = `Created new space '${name}' (ID: ${space.spaceId}) with OpenAI text-embedding-3-small embedder`;
      if (rerankerId) {
        resultText += ` and Cohere reranker (ID: ${rerankerId})`;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: resultText,
          },
        ],
      };
    }
  );

  server.tool(
    "register_reranker",
    "Register a Cohere reranker with Goodmem for improved search relevance. Rerankers re-score results after initial vector search.",
    {
      displayName: z.string().optional().describe('Display name (default: "cohere-reranker")'),
      modelIdentifier: z.string().optional().describe('Model ID (default: "rerank-english-v3.0")'),
      apiKey: z.string().optional().describe("Cohere API key (falls back to COHERE_API_KEY env var)"),
    },
    async ({ displayName, modelIdentifier, apiKey }) => {
      const name = displayName ?? "cohere-reranker";
      const model = modelIdentifier ?? "rerank-english-v3.0";

      // Check for existing
      const rerankers = await client.listRerankers();
      const existingReranker = rerankers.find(r => r.displayName === name);
      if (existingReranker) {
        setResolvedRerankerId(existingReranker.rerankerId);
        return {
          content: [{
            type: "text" as const,
            text: `Reranker '${name}' already exists (ID: ${existingReranker.rerankerId}, model: ${existingReranker.modelIdentifier})`,
          }],
        };
      }

      const key = apiKey ?? getConfig().cohereApiKey;
      if (!key) {
        return {
          content: [{
            type: "text" as const,
            text: "COHERE_API_KEY environment variable is required to register a reranker. Set it and restart.",
          }],
          isError: true,
        };
      }

      const reranker = await client.createReranker({
        displayName: name,
        providerType: "COHERE",
        endpointUrl: "https://api.cohere.com",
        modelIdentifier: model,
        credentials: {
          apiKey: {
            inlineSecret: key,
          },
        },
      });

      setResolvedRerankerId(reranker.rerankerId);

      // Update persisted config
      const persisted = loadPersistedConfig() ?? {};
      savePersistedConfig({ ...persisted, rerankerId: reranker.rerankerId });

      return {
        content: [{
          type: "text" as const,
          text: `Registered reranker '${name}' (ID: ${reranker.rerankerId}) with model ${model}`,
        }],
      };
    }
  );

  server.tool(
    "list_rerankers",
    "List all registered rerankers.",
    {},
    async () => {
      const rerankers = await client.listRerankers();
      if (rerankers.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No rerankers registered. Run register_reranker to add one." }],
        };
      }

      const header = "| ID | Name | Model | Provider |\n|---|---|---|---|";
      const rows = rerankers.map(r => `| ${r.rerankerId} | ${r.displayName} | ${r.modelIdentifier} | ${r.providerType} |`);

      return {
        content: [{ type: "text" as const, text: `## Registered Rerankers\n\n${header}\n${rows.join("\n")}` }],
      };
    }
  );

  server.tool(
    "register_llm",
    "Register an LLM with Goodmem for use in smart search and other LLM-powered features. Uses OpenRouter by default.",
    {
      displayName: z
        .string()
        .optional()
        .describe(
          'Display name for the LLM (default: "openrouter-default")'
        ),
      modelIdentifier: z
        .string()
        .optional()
        .describe(
          'Model identifier (default: "google/gemini-2.0-flash-001")'
        ),
    },
    async ({ displayName, modelIdentifier }) => {
      const name = displayName ?? "openrouter-default";
      const model = modelIdentifier ?? "google/gemini-2.0-flash-001";

      // Check if an LLM with this name already exists
      const llms = await client.listLLMs();
      const existing = llms.find((l) => l.displayName === name);
      if (existing) {
        setResolvedLlmId(existing.llmId);
        return {
          content: [
            {
              type: "text" as const,
              text: `LLM '${name}' already exists (ID: ${existing.llmId}, model: ${existing.modelIdentifier})`,
            },
          ],
        };
      }

      const config = getConfig();
      if (!config.openrouterApiKey) {
        return {
          content: [
            {
              type: "text" as const,
              text: "OPENROUTER_API_KEY environment variable is required to register an LLM. Set it and restart.",
            },
          ],
          isError: true,
        };
      }

      const llm = await client.createLLM({
        displayName: name,
        providerType: "OPENAI",
        endpointUrl: "https://openrouter.ai/api/v1",
        modelIdentifier: model,
        apiPath: "/chat/completions",
        credentials: {
          apiKey: {
            inlineSecret: config.openrouterApiKey,
          },
        },
      });

      setResolvedLlmId(llm.llmId);

      // Update persisted config
      const persisted = loadPersistedConfig() ?? {};
      savePersistedConfig({ ...persisted, llmId: llm.llmId });

      return {
        content: [
          {
            type: "text" as const,
            text: `Registered LLM '${name}' (ID: ${llm.llmId}) with model ${model} via OpenRouter`,
          },
        ],
      };
    }
  );

  server.tool(
    "health_check",
    "Check if Goodmem is running and accessible.",
    {},
    async () => {
      const config = getConfig();
      const healthy = await client.ping();

      if (healthy) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Goodmem is running and healthy at ${config.apiUrl}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Goodmem is not reachable at ${config.apiUrl}. Make sure the server is running:\n\n  goodmem start\n\nOr check your GOODMEM_API_URL configuration.`,
          },
        ],
        isError: true,
      };
    }
  );
}
