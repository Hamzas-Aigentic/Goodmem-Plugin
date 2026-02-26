import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import { getResolvedSpaceId, getConfig } from "../config.js";

function getSpaceId(): string | null {
  return getResolvedSpaceId() ?? getConfig().spaceId ?? null;
}

export function registerSmartSearchTools(
  server: McpServer,
  client: GoodmemClient
): void {
  server.tool(
    "smart_search",
    "Search project memory with LLM-powered synthesis. Returns a natural language answer derived from relevant documentation chunks, rather than raw search results.",
    {
      query: z.string().describe("Natural language search query"),
      limit: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to retrieve"),
      filter: z
        .string()
        .optional()
        .describe(
          "Optional Goodmem filter expression for metadata filtering"
        ),
      llmId: z
        .string()
        .optional()
        .describe(
          "LLM ID to use for synthesis. If not provided, uses the first registered LLM."
        ),
    },
    async ({ query, limit, filter, llmId }) => {
      const spaceId = getSpaceId();
      if (!spaceId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No project space configured. Run setup_space first.",
            },
          ],
          isError: true,
        };
      }

      // Resolve LLM ID
      let resolvedLlmId = llmId;
      if (!resolvedLlmId) {
        const llms = await client.listLLMs();
        if (llms.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No LLMs registered. Run register_llm first to configure an LLM for smart search.",
              },
            ],
            isError: true,
          };
        }
        resolvedLlmId = llms[0].llmId;
      }

      const response = await client.retrieveMemories({
        spaceId,
        message: query,
        requestedSize: limit,
        filter,
        postProcessor: {
          name: "com.goodmem.retrieval.postprocess.ChatPostProcessorFactory",
          config: {
            llm_id: resolvedLlmId,
            relevance_threshold: 0.5,
            llm_temp: 0.3,
            max_results: 10,
          },
        },
      });

      // Prefer the synthesized answer from the LLM
      if (response.abstractReply) {
        return {
          content: [
            {
              type: "text" as const,
              text: response.abstractReply,
            },
          ],
        };
      }

      // Fall back to raw chunks if no abstractReply
      if (!response.items || response.items.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No results found for: "${query}". Try rephrasing your search or ingest more documents.`,
            },
          ],
        };
      }

      const resultBlocks = response.items.map((item, i) => {
        const score = Number(item.chunk.relevanceScore).toFixed(2);
        const memoryId = item.chunk.chunk.memoryId;
        const chunkText = item.chunk.chunk.chunkText;
        return `### Result ${i + 1} (Score: ${score})\n**Memory ID**: ${memoryId}\n${chunkText}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `LLM synthesis was not available. Showing raw results for: "${query}"\n\n${resultBlocks.join("\n\n")}`,
          },
        ],
      };
    }
  );
}
