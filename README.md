# Goodmem Claude Plugin

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.12-green.svg)](https://modelcontextprotocol.io/)

Give Claude Code persistent memory across conversations. Store, search, and retrieve project knowledge — architectural decisions, feature docs, implementation details — via semantic search powered by [Goodmem](https://github.com/goodmem/goodmem).

## Features

- **Semantic search** over project documentation using natural language queries
- **Automatic chunking and embedding** of ingested documents
- **Space auto-detection** — automatically finds or creates a space matching your project name
- **15 MCP tools** for ingesting, searching, and managing project memory
- **10 slash commands** for quick access to common workflows
- **LLM-powered smart search** with synthesized answers (via OpenRouter)
- **Bulk ingestion** of entire documentation directories

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A running [Goodmem](https://github.com/goodmem/goodmem) server
- A Goodmem API key

## Quick Start

### 1. Add the MCP server to Claude Code

```bash
claude mcp add goodmem \
  -e GOODMEM_API_KEY=your-api-key \
  -e GOODMEM_API_URL=https://localhost:8080 \
  -- npx -y goodmem-mcp
```

Or clone and run locally:

```bash
git clone https://github.com/Hamzas-Aigentic/Goodmem-Plugin.git
cd Goodmem-Plugin
npm install && npm run build
claude mcp add goodmem \
  -e GOODMEM_API_KEY=your-api-key \
  -e GOODMEM_API_URL=https://localhost:8080 \
  -- node build/index.js
```

### 2. Initialize your project space

In Claude Code, run:

```
/setup
```

### 3. Start using memory

```
/search how does authentication work
/ingest docs/architecture.md
/memories
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOODMEM_API_KEY` | Yes | — | API key for Goodmem authentication |
| `GOODMEM_API_URL` | No | `https://localhost:8080` | Goodmem server URL |
| `GOODMEM_SPACE_ID` | No | Auto-detect | Explicit space ID (skips auto-detection) |
| `GOODMEM_PROJECT_NAME` | No | Current directory name | Project name used for space creation |
| `GOODMEM_TLS_REJECT_UNAUTHORIZED` | No | `false` | Set to `"1"` to enforce TLS cert validation |
| `OPENAI_API_KEY` | No | — | Required when creating a new embedder |
| `OPENROUTER_API_KEY` | No | — | Required for LLM-powered smart search |

## Tools Reference

### Setup

| Tool | Description |
|------|-------------|
| `setup_space` | Initialize a project space with an embedder and chunking config |
| `register_llm` | Register an LLM via OpenRouter for smart search synthesis |
| `health_check` | Check if the Goodmem server is reachable |

### Ingest

| Tool | Description |
|------|-------------|
| `ingest_document` | Ingest a single file into project memory |
| `ingest_directory` | Bulk ingest all matching files from a directory |

### Search

| Tool | Description |
|------|-------------|
| `search_memory` | Semantic search — returns ranked chunks with relevance scores |
| `smart_search` | LLM-powered search — returns a synthesized natural language answer |

### Manage

| Tool | Description |
|------|-------------|
| `list_memories` | List all ingested documents in the current space |
| `get_memory` | Get full details and metadata of a memory |
| `get_memory_content` | Download the original text content of a memory |
| `delete_memory` | Delete a single memory by ID |
| `batch_delete_memories` | Delete multiple memories at once |
| `list_spaces` | List all accessible spaces |
| `delete_space` | Permanently delete a space and all its memories |
| `update_space` | Update a space name or permissions |

## Slash Commands

Simple shortcuts that map directly to MCP tools:

| Command | Description | Example |
|---------|-------------|---------|
| `/setup` | Initialize a memory space | `/setup` or `/setup my-project` |
| `/search <query>` | Semantic search | `/search how does auth work` |
| `/smart <query>` | LLM-synthesized search | `/smart what patterns does the API use` |
| `/ingest <path>` | Ingest a single file | `/ingest docs/auth.md` |
| `/recall <id>` | Get full content of a memory | `/recall abc-123` |
| `/memories` | List all ingested documents | `/memories` |
| `/spaces` | List all spaces | `/spaces` |

### Workflow Commands

Multi-step skills for common workflows:

| Command | Description |
|---------|-------------|
| `/ingest-docs [path]` | Set up space and bulk ingest all markdown from a directory |
| `/save-feature [name]` | Write a feature summary doc and ingest it into memory |
| `/search-context <query>` | Search with context synthesis and source citations |

## Recommended Workflow

1. **First use** — Run `/setup` to initialize the project space
2. **Before any work** — Run `/search` to retrieve relevant prior context
3. **After completing work** — Run `/save-feature` to document what was built and why

## Development

### Build

```bash
npm install
npm run build
```

### Project Structure

```
src/
├── index.ts              # Server entry point, tool registration, stdio transport
├── config.ts             # Environment variable configuration
├── goodmem-client.ts     # Typed HTTP client for Goodmem REST API
└── tools/
    ├── setup.ts          # setup_space, register_llm, health_check
    ├── ingest.ts         # ingest_document, ingest_directory
    ├── search.ts         # search_memory
    ├── manage.ts         # list/get/delete memories and spaces
    └── smart-search.ts   # smart_search with LLM synthesis
skills/                   # Claude Code slash commands
docs/                     # Architecture documentation
```

## License

[MIT](LICENSE)
