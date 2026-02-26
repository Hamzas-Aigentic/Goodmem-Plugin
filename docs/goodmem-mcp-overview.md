# Goodmem MCP Server

## What It Is

A TypeScript MCP (Model Context Protocol) server that gives Claude Code semantic memory over project documentation via the Goodmem API. It allows Claude to store, search, and retrieve project knowledge across conversations — architectural decisions, feature docs, change logs, and implementation details persist and are searchable by natural language.

## Why It Exists

Claude Code has no memory between sessions. Every new conversation starts from scratch. This MCP bridges that gap by connecting Claude to Goodmem, a vector-based memory system. Before implementing a feature or fixing a bug, Claude can search for prior context — what was built, why, and how — avoiding repeated mistakes and maintaining consistency.

## Architecture

### Data Hierarchy

- **Embedder** — Embedding model configuration (e.g. OpenAI text-embedding-3-small). Shared across spaces. Converts text into vector representations for semantic search.
- **Space** — A project-scoped knowledge base. One space per project. Has an embedder and chunking strategy attached.
- **Memory** — A document ingested into a space (markdown files, text content). Each memory has metadata, content type, and processing status.
- **Chunks** — Goodmem automatically splits each memory into chunks, embeds them, and stores vectors. Chunks are the atomic unit of search retrieval.

### Project Structure

```
src/
├── index.ts              # Server entry point, registers tools + prompts, stdio transport
├── config.ts             # Env var config (API key, URL, project name, space ID)
├── goodmem-client.ts     # Typed HTTP client for Goodmem REST API
└── tools/
    ├── setup.ts          # setup_space, health_check
    ├── ingest.ts         # ingest_document, ingest_directory
    ├── search.ts         # search_memory (primary retrieval)
    └── manage.ts         # list_memories, get_memory, get_memory_content,
                          # delete_memory, batch_delete_memories,
                          # list_spaces, delete_space, update_space
```

### Key Design Decisions

- **stdio transport** — MCP communicates over stdin/stdout JSON-RPC. Never use `console.log()` — it corrupts the protocol. Use `console.error()` for debug output.
- **NDJSON streaming for retrieval** — The retrieve-advanced endpoint returns newline-delimited JSON, not a single JSON response. The client parses each line and extracts `retrievedItem` objects.
- **Space auto-resolution** — On `setup_space`, the server checks for an existing space matching the project name before creating a new one. The resolved space ID is held in memory for the session.
- **Self-signed TLS** — Local Goodmem runs HTTPS with a self-signed cert. The client uses an `undici` dispatcher with `rejectUnauthorized: false` when `GOODMEM_TLS_REJECT_UNAUTHORIZED` is not set to `"1"`.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `setup_space` | Initialize project: find/create embedder + space |
| `health_check` | Verify Goodmem server is reachable |
| `ingest_document` | Ingest a single markdown file into memory |
| `ingest_directory` | Bulk ingest all matching files from a directory |
| `search_memory` | Semantic search across project memories |
| `list_memories` | List all ingested documents in the project space |
| `get_memory` | Get full details of a memory by ID |
| `get_memory_content` | Download the original content of a memory |
| `delete_memory` | Remove a single memory by ID |
| `batch_delete_memories` | Delete multiple memories at once |
| `list_spaces` | List all accessible spaces |
| `delete_space` | Permanently delete a space and all its memories |
| `update_space` | Update a space's name or public read setting |

## Goodmem REST API Field Mapping

The MCP client maps to these exact Goodmem REST API fields:

- **Embedder**: `displayName`, `providerType`, `modelIdentifier`, `dimensionality`, `distributionType`, `endpointUrl`
- **Space**: `name`, `spaceId`, `defaultChunkingConfig`, `spaceEmbedders[]`
- **Memory**: `memoryId`, `spaceId`, `originalContent`, `contentType`, `metadata`, `processingStatus`
- **Retrieval**: `message` (not "query"), `spaceKeys[].spaceId` (not bare "spaceId"), `requestedSize` (not "limit")

## Configuration

| Env Variable | Required | Description |
|---|---|---|
| `GOODMEM_API_KEY` | Yes | API key for authentication |
| `GOODMEM_API_URL` | No | Server URL (default: `https://localhost:8080`) |
| `GOODMEM_SPACE_ID` | No | Pre-configured space ID (skips auto-detection) |
| `GOODMEM_PROJECT_NAME` | No | Project name (default: cwd basename) |
| `GOODMEM_TLS_REJECT_UNAUTHORIZED` | No | Set to `"1"` to enforce TLS cert validation |

## Recommended Workflow

1. **First use**: `setup_space` to initialize the project's space
2. **Before any work**: `search_memory` to retrieve relevant prior context
3. **After completing work**: Write a markdown doc describing what was built and why, then `ingest_document` to store it
