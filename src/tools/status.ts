import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import { getEffectiveSpaceId, loadPersistedConfig } from "../config.js";

export function registerStatusTools(server: McpServer, client: GoodmemClient): void {
  server.tool(
    "status",
    "Show the current Goodmem configuration: space, memory count, embedders, rerankers, LLMs, and chunking strategy.",
    {},
    async () => {
      const spaceId = getEffectiveSpaceId();
      if (!spaceId) {
        return {
          content: [{
            type: "text" as const,
            text: "No project space configured. Run setup_space first.",
          }],
          isError: true,
        };
      }

      try {
        const [space, memories, rerankers, llms] = await Promise.all([
          client.getSpace(spaceId),
          client.listMemories(spaceId),
          client.listRerankers(),
          client.listLLMs(),
        ]);

        const config = loadPersistedConfig();

        // Format chunking info
        let chunkingInfo = "unknown";
        if (config?.chunkingPreset) {
          chunkingInfo = config.chunkingPreset;
        }
        if (space.defaultChunkingConfig?.recursive) {
          const r = space.defaultChunkingConfig.recursive;
          chunkingInfo += ` (recursive, ${r.chunkSize ?? "?"} chars, ${r.chunkOverlap ?? "?"} overlap)`;
        } else if (space.defaultChunkingConfig?.sentence) {
          chunkingInfo = `sentence-based`;
        }

        // Format embedders
        const embedderInfo = space.spaceEmbedders && space.spaceEmbedders.length > 0
          ? space.spaceEmbedders.map(e => `${e.embedderId} (weight: ${e.defaultRetrievalWeight ?? 1.0})`).join(", ")
          : "none";

        // Format rerankers
        const rerankerInfo = rerankers.length > 0
          ? rerankers.map(r => `${r.displayName} (${r.modelIdentifier})`).join(", ")
          : "not configured";

        // Format LLMs
        const llmInfo = llms.length > 0
          ? llms.map(l => `${l.displayName} (${l.modelIdentifier})`).join(", ")
          : "not configured";

        // Find last ingest date
        let lastIngest = "never";
        if (memories.length > 0) {
          const dates = memories
            .map(m => m.createdAt)
            .filter((d): d is string => d !== undefined)
            .sort()
            .reverse();
          if (dates.length > 0) lastIngest = dates[0];
        }

        const text = [
          `## Goodmem Status`,
          ``,
          `| Property | Value |`,
          `|----------|-------|`,
          `| Space | ${space.name} (${space.spaceId}) |`,
          `| Memories | ${memories.length} documents |`,
          `| Chunking | ${chunkingInfo} |`,
          `| Embedder(s) | ${embedderInfo} |`,
          `| Reranker(s) | ${rerankerInfo} |`,
          `| LLM(s) | ${llmInfo} |`,
          `| Last Ingest | ${lastIngest} |`,
        ].join("\n");

        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to get status: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    }
  );
}
