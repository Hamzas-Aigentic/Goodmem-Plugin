# Goodmem MCP Server

TypeScript MCP server that gives Claude Code semantic memory over project documentation via the Goodmem API.

## Project Structure

- `src/index.ts` — Server entry point, registers all tools, stdio transport
- `src/config.ts` — Env var config (GOODMEM_API_KEY, GOODMEM_API_URL, auto-detect project name)
- `src/goodmem-client.ts` — Typed HTTP client for Goodmem REST API
- `src/tools/ingest.ts` — ingest_document, ingest_directory
- `src/tools/search.ts` — search_memory (primary retrieval tool)
- `src/tools/manage.ts` — list_memories, delete_memory
- `src/tools/setup.ts` — setup_space, health_check

## Build & Run

```bash
npm run build        # Compiles to build/
npm start            # Runs the server (stdio transport)
```

## Key Conventions

- Never use `console.log()` — stdio transport uses stdout for JSON-RPC. Use `console.error()` only.
- All tools return `{ content: [{ type: "text", text: "..." }] }` format.
- Tool inputs use Zod schemas via `server.tool(name, description, schema, handler)`.
- The Goodmem REST API uses camelCase JSON fields.
- Space auto-detection: resolves from GOODMEM_SPACE_ID env var, or finds/creates a space matching the cwd basename.
