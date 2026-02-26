import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import { getResolvedSpaceId, getConfig } from "../config.js";

function getSpaceId(): string | null {
  return getResolvedSpaceId() ?? getConfig().spaceId ?? null;
}

export function registerSearchTools(
  server: McpServer,
  client: GoodmemClient
): void {
  server.tool(
    "search_memory",
    "Search project documentation and feature history using natural language. Use this when you need context about how a feature was implemented, what decisions were made, how components work together, or any historical project knowledge.",
    {
      query: z.string().describe("Natural language search query"),
      limit: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
      filter: z
        .string()
        .optional()
        .describe(
          "Optional Goodmem filter expression for metadata filtering"
        ),
    },
    async ({ query, limit, filter }) => {
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

      const response = await client.retrieveMemories({
        spaceId,
        message: query,
        requestedSize: limit,
        filter,
      });

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

      const text = `## Search Results for: "${query}"\n\n${resultBlocks.join("\n\n")}\n\n---\nBased on the above results, provide a clear synthesized answer to the user's query. Do not just repeat the chunks — interpret and summarize them into a direct response.`;

      return {
        content: [
          {
            type: "text" as const,
            text,
          },
        ],
      };
    }
  );
}
