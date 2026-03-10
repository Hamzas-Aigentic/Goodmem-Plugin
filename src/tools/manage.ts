import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import { getEffectiveSpaceId } from "../config.js";

export function registerManageTools(
  server: McpServer,
  client: GoodmemClient
): void {
  // ── List Memories ───────────────────────────────────────────────────────

  server.tool(
    "list_memories",
    "List all ingested documents in the current project's memory space.",
    {
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Maximum number of memories to list"),
    },
    async ({ limit }) => {
      const spaceId = getEffectiveSpaceId();
      if (!spaceId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No space configured. Run setup_space first or set GOODMEM_SPACE_ID.",
            },
          ],
          isError: true,
        };
      }

      const memories = await client.listMemories(spaceId, limit);
      if (memories.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "## Project Memories (0 documents)\n\nNo documents ingested yet. Use ingest_document or ingest_directory to add documents.",
            },
          ],
        };
      }

      const rows = memories
        .map((m) => {
          const meta = typeof m.metadata === "string"
            ? (() => { try { return JSON.parse(m.metadata); } catch { return {}; } })()
            : m.metadata ?? {};
          const file = meta.fileName ?? meta.filePath ?? "—";
          const status = m.processingStatus ?? "—";
          const ingested = m.createdAt ?? "—";
          return `| ${m.memoryId} | ${file} | ${status} | ${ingested} |`;
        })
        .join("\n");

      const table = `## Project Memories (${memories.length} documents)\n\n| ID | File | Status | Ingested At |\n|---|---|---|---|\n${rows}`;

      return { content: [{ type: "text" as const, text: table }] };
    }
  );

  // ── Get Memory ──────────────────────────────────────────────────────────

  server.tool(
    "get_memory",
    "Get full details of a specific memory by ID, including processing status.",
    {
      memoryId: z
        .string()
        .describe("The memory ID to retrieve"),
    },
    async ({ memoryId }) => {
      const memory = await client.getMemory(memoryId);
      const meta = typeof memory.metadata === "string"
        ? (() => { try { return JSON.parse(memory.metadata); } catch { return {}; } })()
        : memory.metadata ?? {};

      const details = [
        `**Memory ID**: ${memory.memoryId}`,
        `**Space ID**: ${memory.spaceId}`,
        `**Content Type**: ${memory.contentType ?? "—"}`,
        `**Processing Status**: ${memory.processingStatus ?? "—"}`,
        `**Content Length**: ${memory.originalContentLength ?? "—"}`,
        `**Created At**: ${memory.createdAt ?? "—"}`,
        `**Updated At**: ${memory.updatedAt ?? "—"}`,
        `**Metadata**: ${JSON.stringify(meta, null, 2)}`,
      ].join("\n");

      return { content: [{ type: "text" as const, text: details }] };
    }
  );

  // ── Get Memory Content ──────────────────────────────────────────────────

  server.tool(
    "get_memory_content",
    "Download the original content of a memory. Returns the raw text that was ingested.",
    {
      memoryId: z
        .string()
        .describe("The memory ID to download content for"),
    },
    async ({ memoryId }) => {
      const content = await client.getMemoryContent(memoryId);
      return { content: [{ type: "text" as const, text: content }] };
    }
  );

  // ── Delete Memory ───────────────────────────────────────────────────────

  server.tool(
    "delete_memory",
    "Remove a document from project memory by its memory ID.",
    {
      memoryId: z
        .string()
        .describe("The memory ID to delete (from list_memories output)"),
    },
    async ({ memoryId }) => {
      await client.deleteMemory(memoryId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully deleted memory ${memoryId}`,
          },
        ],
      };
    }
  );

  // ── Batch Delete Memories ───────────────────────────────────────────────

  server.tool(
    "batch_delete_memories",
    "Delete multiple memories at once by their IDs.",
    {
      memoryIds: z
        .array(z.string())
        .describe("Array of memory IDs to delete"),
    },
    async ({ memoryIds }) => {
      const result = await client.batchDeleteMemories(
        memoryIds.map((memoryId) => ({ memoryId }))
      );

      const succeeded = result.results.filter(
        (r) => r.success === true || r.success === "true"
      ).length;
      const failed = result.results.length - succeeded;

      let text = `Batch delete: ${succeeded} succeeded, ${failed} failed.`;
      if (failed > 0) {
        const errors = result.results
          .filter((r) => r.success !== true && r.success !== "true")
          .map((r) => `- ${r.memoryId}: ${r.error?.message ?? "unknown error"}`)
          .join("\n");
        text += `\n\nErrors:\n${errors}`;
      }

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ── List Spaces ─────────────────────────────────────────────────────────

  server.tool(
    "list_spaces",
    "List all memory spaces you have access to.",
    {},
    async () => {
      const spaces = await client.listSpaces();
      if (spaces.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No spaces found. Use setup_space to create one.",
            },
          ],
        };
      }

      const rows = spaces
        .map((s) => {
          const embedderCount = s.spaceEmbedders?.length ?? 0;
          return `| ${s.spaceId} | ${s.name} | ${embedderCount} embedder(s) | ${s.createdAt ?? "—"} |`;
        })
        .join("\n");

      const table = `## Spaces (${spaces.length})\n\n| ID | Name | Embedders | Created At |\n|---|---|---|---|\n${rows}`;

      return { content: [{ type: "text" as const, text: table }] };
    }
  );

  // ── Delete Space ────────────────────────────────────────────────────────

  server.tool(
    "delete_space",
    "Delete a memory space and all its associated memories. This is permanent and cannot be undone.",
    {
      spaceId: z
        .string()
        .describe("The space ID to delete"),
    },
    async ({ spaceId }) => {
      await client.deleteSpace(spaceId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully deleted space ${spaceId} and all its memories.`,
          },
        ],
      };
    }
  );

  // ── Update Space ────────────────────────────────────────────────────────

  server.tool(
    "update_space",
    "Update a space's name or labels.",
    {
      spaceId: z.string().describe("The space ID to update"),
      name: z.string().optional().describe("New name for the space"),
      publicRead: z
        .boolean()
        .optional()
        .describe("Whether the space is publicly readable"),
    },
    async ({ spaceId, name, publicRead }) => {
      const space = await client.updateSpace(spaceId, { name, publicRead });
      return {
        content: [
          {
            type: "text" as const,
            text: `Updated space '${space.name}' (ID: ${space.spaceId})`,
          },
        ],
      };
    }
  );

  // ── Delete LLM ──────────────────────────────────────────────────────────

  server.tool(
    "delete_llm",
    "Delete a registered LLM.",
    {
      llmId: z.string().describe("The LLM ID to delete"),
    },
    async ({ llmId }) => {
      await client.deleteLLM(llmId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully deleted LLM ${llmId}`,
          },
        ],
      };
    }
  );

  // ── Delete Reranker ───────────────────────────────────────────────────

  server.tool(
    "delete_reranker",
    "Delete a registered reranker.",
    {
      rerankerId: z.string().describe("The reranker ID to delete"),
    },
    async ({ rerankerId }) => {
      await client.deleteReranker(rerankerId);
      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully deleted reranker ${rerankerId}`,
          },
        ],
      };
    }
  );
}
