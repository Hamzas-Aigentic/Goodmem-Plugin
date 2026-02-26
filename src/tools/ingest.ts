import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import { getResolvedSpaceId, getConfig } from "../config.js";

function getSpaceId(): string | null {
  return getResolvedSpaceId() ?? getConfig().spaceId ?? null;
}

async function walkMarkdownFiles(
  dir: string,
  pattern: string
): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (matchesPattern(fullPath, dir, pattern)) {
          results.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return results;
}

function matchesPattern(
  filePath: string,
  baseDir: string,
  pattern: string
): boolean {
  const relativePath = path.relative(baseDir, filePath);
  // Simple glob matching: support **/*.md and *.md patterns
  if (pattern === "**/*.md") {
    return relativePath.endsWith(".md");
  }
  if (pattern === "*.md") {
    return (
      relativePath.endsWith(".md") && !relativePath.includes(path.sep)
    );
  }
  // For custom patterns, do basic extension matching
  const ext = pattern.replace(/^\*\*\/\*/, "").replace(/^\*/, "");
  if (ext.startsWith(".")) {
    return relativePath.endsWith(ext);
  }
  return relativePath.endsWith(".md");
}

export function registerIngestTools(
  server: McpServer,
  client: GoodmemClient
): void {
  server.tool(
    "ingest_document",
    "Ingest a markdown document into project memory. Use this to store feature documentation, change logs, or architectural decisions for later retrieval.",
    {
      filePath: z
        .string()
        .describe("Absolute path to the markdown file to ingest"),
      metadata: z
        .record(z.string())
        .optional()
        .describe(
          "Optional metadata key-value pairs (e.g., feature name, author)"
        ),
    },
    async ({ filePath, metadata }) => {
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

      const fileContent = await fs.readFile(filePath, "utf-8");
      const fileName = path.basename(filePath);

      const memory = await client.createMemory({
        spaceId,
        originalContent: fileContent,
        contentType: "text/markdown",
        metadata: {
          ...metadata,
          filePath,
          fileName,
          ingestedAt: new Date().toISOString(),
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully ingested ${fileName} (Memory ID: ${memory.memoryId})`,
          },
        ],
      };
    }
  );

  server.tool(
    "ingest_directory",
    "Bulk ingest all markdown files from a directory into project memory.",
    {
      directoryPath: z
        .string()
        .describe(
          "Absolute path to directory containing markdown files"
        ),
      pattern: z
        .string()
        .optional()
        .describe(
          "Glob pattern for files to ingest (default: **/*.md)"
        ),
    },
    async ({ directoryPath, pattern }) => {
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

      const globPattern = pattern ?? "**/*.md";
      const files = await walkMarkdownFiles(directoryPath, globPattern);

      if (files.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No files matching "${globPattern}" found in ${directoryPath}.`,
            },
          ],
        };
      }

      const results: Array<{ fileName: string; id: string }> = [];

      for (const filePath of files) {
        const fileContent = await fs.readFile(filePath, "utf-8");
        const fileName = path.basename(filePath);

        const memory = await client.createMemory({
          spaceId,
          originalContent: fileContent,
          contentType: "text/markdown",
          metadata: {
            filePath,
            fileName,
            ingestedAt: new Date().toISOString(),
          },
        });

        results.push({ fileName, id: memory.memoryId });
      }

      const fileList = results
        .map((r) => `- ${r.fileName} (ID: ${r.id})`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Ingested ${results.length} documents from ${directoryPath}:\n${fileList}`,
          },
        ],
      };
    }
  );
}
