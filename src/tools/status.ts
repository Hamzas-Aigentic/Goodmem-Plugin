import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import {
  getConfig,
  getEffectiveSpaceId,
  getResolvedRerankerId,
  getResolvedLlmId,
  getResolvedEmbedderId,
  loadPersistedConfig,
} from "../config.js";

export function registerStatusTools(
  server: McpServer,
  _client: GoodmemClient
): void {
  server.tool(
    "status",
    "Show the current Goodmem plugin configuration, including resolved IDs and persisted settings.",
    {},
    async () => {
      const config = getConfig();
      const persisted = loadPersistedConfig();
      const effectiveSpaceId = getEffectiveSpaceId();

      const lines: string[] = [
        "Goodmem Plugin Status",
        "=====================",
        "",
        `API URL: ${config.apiUrl}`,
        `Project Name: ${config.projectName}`,
        `TLS Reject Unauthorized: ${config.tlsRejectUnauthorized}`,
        "",
        "Resolved IDs:",
        `  Space ID: ${effectiveSpaceId ?? "(not set)"}`,
        `  Reranker ID: ${getResolvedRerankerId() ?? "(not set)"}`,
        `  LLM ID: ${getResolvedLlmId() ?? "(not set)"}`,
        `  Embedder ID: ${getResolvedEmbedderId() ?? "(not set)"}`,
        "",
        "Persisted Config (.goodmem.json):",
        persisted
          ? JSON.stringify(persisted, null, 2)
          : "  (no persisted config found)",
        "",
        "API Keys:",
        `  GOODMEM_API_KEY: ${config.apiKey ? "set" : "not set"}`,
        `  OPENAI_API_KEY: ${config.openaiApiKey ? "set" : "not set"}`,
        `  OPENROUTER_API_KEY: ${config.openrouterApiKey ? "set" : "not set"}`,
        `  COHERE_API_KEY: ${config.cohereApiKey ? "set" : "not set"}`,
      ];

      return {
        content: [
          {
            type: "text" as const,
            text: lines.join("\n"),
          },
        ],
      };
    }
  );
}
