#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GoodmemClient } from "./goodmem-client.js";
import { getConfig } from "./config.js";
import { registerIngestTools } from "./tools/ingest.js";
import { registerSearchTools } from "./tools/search.js";
import { registerManageTools } from "./tools/manage.js";
import { registerSetupTools } from "./tools/setup.js";
import { registerSmartSearchTools } from "./tools/smart-search.js";

async function main() {
  const config = getConfig();

  // Create a custom dispatcher to handle self-signed certificates
  let dispatcher: unknown;
  if (!config.tlsRejectUnauthorized) {
    const { Agent } = await import("undici");
    dispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }

  const client = new GoodmemClient({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    dispatcher,
  });

  const server = new McpServer(
    { name: "goodmem-mcp", version: "1.0.1" },
    {
      instructions: `You have access to Goodmem, a semantic memory system for this project's documentation and feature history.

IMPORTANT: ALWAYS call search_memory BEFORE implementing new features, fixing bugs, or refactoring code. This retrieves relevant architectural decisions, implementation details, and historical context.

Workflow:
1. First use in a project: call setup_space to initialize
2. Before any work: call search_memory with a relevant natural language query
3. After completing work: create a markdown doc describing what was built and why, then call ingest_document to store it

When writing feature docs for ingestion, include: what was built, why, how (key implementation details, patterns, important files), trade-off decisions, and dependencies.

CRITICAL: After calling search_memory, ALWAYS synthesize a clear, direct answer from the retrieved chunks. Do NOT just present the raw chunks to the user — interpret them and answer the user's question based on what was found. If the results don't fully answer the question, say what you found and what's missing.`,
    }
  );

  // Register all tools
  registerIngestTools(server, client);
  registerSearchTools(server, client);
  registerManageTools(server, client);
  registerSetupTools(server, client);
  registerSmartSearchTools(server, client);

  // Register prompts (appear as /mcp__goodmem__<name> commands)
  server.prompt(
    "ingest_project_docs",
    "Ingest all markdown documentation from the project's docs directory into Goodmem memory",
    {
      docsPath: z
        .string()
        .optional()
        .describe("Path to docs directory (default: ./docs)"),
    },
    ({ docsPath }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Please ingest all markdown files from ${docsPath ?? "./docs"} into Goodmem. First run setup_space if needed, then use ingest_directory.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "feature_context",
    "Search Goodmem for all context about a specific feature before working on it",
    {
      feature: z
        .string()
        .describe("Feature name or description to search for"),
    },
    ({ feature }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Search Goodmem memory for all context about: "${feature}". Look for architectural decisions, implementation details, related features, and any historical notes. Use search_memory with relevant queries.`,
          },
        },
      ],
    })
  );

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Goodmem MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
