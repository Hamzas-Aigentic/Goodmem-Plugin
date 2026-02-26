import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import { getConfig, setResolvedSpaceId } from "../config.js";

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
    },
    async ({ projectName }) => {
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

      // Create space with the embedder
      const space = await client.createSpace({
        name,
        defaultChunkingConfig: { recursive: { chunkSize: 1000, chunkOverlap: 200 } },
        spaceEmbedders: [{ embedderId: embedder.embedderId }],
      });

      setResolvedSpaceId(space.spaceId);

      return {
        content: [
          {
            type: "text" as const,
            text: `Created new space '${name}' (ID: ${space.spaceId}) with OpenAI text-embedding-3-small embedder`,
          },
        ],
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
