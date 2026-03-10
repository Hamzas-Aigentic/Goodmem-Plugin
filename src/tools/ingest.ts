import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoodmemClient } from "../goodmem-client.js";
import { getEffectiveSpaceId } from "../config.js";
import { detectContentType, isTextBased, isPdf, isImage } from "../mime.js";

function matchesGlob(filePath: string, baseDir: string, pattern: string): boolean {
  const relativePath = path.relative(baseDir, filePath);
  const ext = path.extname(filePath);

  // Handle **/*.ext patterns
  if (pattern.startsWith("**/")) {
    const targetExt = pattern.slice(3); // e.g., "*.md" -> get ".md"
    const dotIdx = targetExt.lastIndexOf(".");
    if (dotIdx >= 0) {
      return ext === targetExt.slice(dotIdx);
    }
  }

  // Handle *.ext patterns (top-level only)
  if (pattern.startsWith("*.") && !pattern.includes("/")) {
    const targetExt = "." + pattern.slice(2);
    return ext === targetExt && !relativePath.includes(path.sep);
  }

  // Handle **/* (all files)
  if (pattern === "**/*") return true;

  // Fallback: match by extension
  const patternExt = path.extname(pattern);
  if (patternExt) return ext === patternExt;

  return true;
}

async function walkFiles(dir: string, pattern: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (matchesGlob(fullPath, dir, pattern)) {
          results.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return results;
}

export function registerIngestTools(
  server: McpServer,
  client: GoodmemClient
): void {
  server.tool(
    "ingest_document",
    "Ingest a document into project memory. Supports markdown, text, code files, PDFs, and images.",
    {
      filePath: z
        .string()
        .describe("Absolute path to the file to ingest"),
      metadata: z
        .record(z.string())
        .optional()
        .describe(
          "Optional metadata key-value pairs (e.g., feature name, author)"
        ),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, replace existing memory with same file path"),
    },
    async ({ filePath, metadata, overwrite }) => {
      const spaceId = getEffectiveSpaceId();
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

      const contentType = detectContentType(filePath);
      const fileName = path.basename(filePath);

      // Dedup check
      const memories = await client.listMemories(spaceId);
      const existingMemory = memories.find((m) => {
        const meta = typeof m.metadata === "string"
          ? (() => { try { return JSON.parse(m.metadata); } catch { return {}; } })()
          : m.metadata ?? {};
        return meta.filePath === filePath;
      });

      if (existingMemory && !overwrite) {
        return {
          content: [
            {
              type: "text" as const,
              text: `A memory already exists for this file (Memory ID: ${existingMemory.memoryId}). Pass overwrite: true to replace it.`,
            },
          ],
        };
      }

      if (existingMemory && overwrite) {
        await client.deleteMemory(existingMemory.memoryId);
      }

      let originalContent: string;
      let finalContentType: string = contentType;
      const memoryMetadata: Record<string, string> = {
        ...(metadata ?? {}),
        filePath,
        fileName,
        ingestedAt: new Date().toISOString(),
      };

      if (isPdf(contentType)) {
        // PDF: OCR and extract markdown
        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString("base64");
        const ocrResult = await client.ocrDocument({
          content: base64,
          format: "PDF",
          includeMarkdown: true,
        });
        const pages = ocrResult.pages ?? [];
        originalContent = pages.map(p => p.markdown ?? "").join("\n\n---\n\n");
        finalContentType = "text/markdown";
        memoryMetadata.originalFormat = "pdf";
      } else if (isImage(contentType)) {
        // Image: OCR and extract text
        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString("base64");
        const ocrResult = await client.ocrDocument({
          content: base64,
          format: "AUTO",
          includeMarkdown: true,
        });
        const pages = ocrResult.pages ?? [];
        originalContent = pages.map(p => p.markdown ?? "").join("\n\n");
        finalContentType = "text/markdown";
        memoryMetadata.originalFormat = "image";
      } else if (isTextBased(contentType)) {
        // Text-based: read as UTF-8
        originalContent = await fs.readFile(filePath, "utf-8");
      } else {
        // Unknown type: try reading as UTF-8
        originalContent = await fs.readFile(filePath, "utf-8");
      }

      const memory = await client.createMemory({
        spaceId,
        originalContent,
        contentType: finalContentType,
        metadata: memoryMetadata,
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
    "Bulk ingest files from a directory into project memory.",
    {
      directoryPath: z
        .string()
        .describe(
          "Absolute path to directory containing files"
        ),
      pattern: z
        .string()
        .optional()
        .describe(
          "Glob pattern for files to ingest (default: **/*.md)"
        ),
      metadata: z
        .record(z.string())
        .optional()
        .describe("Optional metadata to attach to all ingested files"),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, replace existing memories with same file paths"),
    },
    async ({ directoryPath, pattern, metadata, overwrite }) => {
      const spaceId = getEffectiveSpaceId();
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
      const files = await walkFiles(directoryPath, globPattern);

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

      // Dedup check: get existing memories to find duplicates
      let existingMemories: Awaited<ReturnType<typeof client.listMemories>> = [];
      if (overwrite) {
        existingMemories = await client.listMemories(spaceId);
      }

      // Delete existing memories for files we're about to overwrite
      if (overwrite && existingMemories.length > 0) {
        const toDelete: string[] = [];
        for (const filePath of files) {
          const existing = existingMemories.find((m) => {
            const meta = typeof m.metadata === "string"
              ? (() => { try { return JSON.parse(m.metadata); } catch { return {}; } })()
              : m.metadata ?? {};
            return meta.filePath === filePath;
          });
          if (existing) {
            toDelete.push(existing.memoryId);
          }
        }
        if (toDelete.length > 0) {
          await client.batchDeleteMemories(
            toDelete.map((memoryId) => ({ memoryId }))
          );
        }
      }

      // Batch ingest in groups of 20
      const BATCH_SIZE = 20;
      const results: Array<{ fileName: string; id?: string; error?: string }> = [];

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchParams = await Promise.all(
          batch.map(async (filePath) => {
            const fileContent = await fs.readFile(filePath, "utf-8");
            const fileName = path.basename(filePath);
            const ct = detectContentType(filePath);
            return {
              spaceId,
              originalContent: fileContent,
              contentType: ct,
              metadata: {
                ...(metadata ?? {}),
                filePath,
                fileName,
                ingestedAt: new Date().toISOString(),
              },
            };
          })
        );

        const batchResults = await client.createMemoriesBatch(batchParams);
        for (let j = 0; j < batchResults.length; j++) {
          const r = batchResults[j];
          const success = r.success === true || r.success === "true";
          results.push({
            fileName: path.basename(batch[j]),
            id: success ? r.memoryId : undefined,
            error: success ? undefined : "Failed to ingest",
          });
        }
      }

      const succeeded = results.filter(r => r.id).length;
      const failed = results.filter(r => r.error).length;

      const fileList = results
        .map((r) => {
          if (r.id) return `- ${r.fileName} (ID: ${r.id})`;
          return `- ${r.fileName} (FAILED: ${r.error})`;
        })
        .join("\n");

      let summary = `Ingested ${succeeded} documents from ${directoryPath}`;
      if (failed > 0) summary += ` (${failed} failed)`;

      return {
        content: [
          {
            type: "text" as const,
            text: `${summary}:\n${fileList}`,
          },
        ],
      };
    }
  );
}
