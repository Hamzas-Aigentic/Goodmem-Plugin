# Goodmem Claude Plugin

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.12-green.svg)](https://modelcontextprotocol.io/)

Give Claude Code persistent memory across conversations. Store, search, and retrieve project knowledge — architectural decisions, feature docs, implementation details — via semantic search powered by [Goodmem](https://goodmem.ai/).

## How It Works

```
  Ingest              Embed & Store            Search
┌─────────┐        ┌───────────────┐        ┌──────────┐
│ Markdown │──────▶ │ Chunks → Vectors │──────▶ │ Semantic │
│  files   │        │  (Goodmem API)  │        │  recall  │
└─────────┘        └───────────────┘        └──────────┘
```

1. **Ingest** — Feed markdown docs (architecture notes, feature summaries, changelogs) into Goodmem
2. **Embed** — Goodmem chunks the text and generates vector embeddings automatically
3. **Search** — Query your project's memory with natural language; get back relevant context ranked by similarity

Claude uses this loop every session: search before working, ingest after completing work.

## What is Goodmem?

[Goodmem](https://goodmem.ai/) is agentic AI memory infrastructure. It gives AI tools persistent memory via vector-based semantic search — documents are chunked, embedded, and stored so they can be retrieved by natural language queries. Claude Code has no memory between sessions; Goodmem bridges that gap.

- **Website:** [goodmem.ai](https://goodmem.ai/)
- **Documentation:** [docs.goodmem.ai](https://docs.goodmem.ai/docs/)
- **Quick Start:** [goodmem.ai/quick-start](https://goodmem.ai/quick-start)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A running Goodmem server (see [Setting Up Goodmem](#setting-up-goodmem))
- A Goodmem API key

## Setting Up Goodmem

### Install Locally

```bash
curl -s "https://get.goodmem.ai" | bash
```

Installs the server, web console, CLI, and all dependencies. Windows users should install via [WSL](https://learn.microsoft.com/en-us/windows/wsl/).

### Deploy to Cloud

```bash
# Railway
curl -s https://get.goodmem.ai/railway | bash

# Fly.io
curl -s https://get.goodmem.ai/flyio | bash
```

> **Save your API key.** The installer outputs a Root API Key (`gm_xxx...`) — this is your `GOODMEM_API_KEY` for the plugin. It only appears once.

Once the server is running, the **web console** is available at `https://localhost:8080/console/` — use it to manage spaces, embedders, LLMs, upload documents, and run searches from your browser.

For full setup details, see the [Goodmem Quick Start](https://goodmem.ai/quick-start) and [documentation](https://docs.goodmem.ai/docs/).

## Quick Start

### 1. Add the plugin to Claude Code

**If Goodmem is installed locally** (default `https://localhost:8080`):

```bash
claude mcp add goodmem \
  -e GOODMEM_API_KEY=gm_your-api-key \
  -- npx -y goodmem-mcp
```

**If Goodmem is hosted on Railway, Fly.io, or another server:**

```bash
claude mcp add goodmem \
  -e GOODMEM_API_KEY=gm_your-api-key \
  -e GOODMEM_API_URL=https://your-goodmem-server.example.com \
  -- npx -y goodmem-mcp
```

> `GOODMEM_API_KEY` is the Root API Key from your Goodmem install (`gm_xxx...`).
> `GOODMEM_API_URL` only needs to be set if Goodmem is not running on localhost.

<details>
<summary>Or install from source</summary>

```bash
git clone https://github.com/Hamzas-Aigentic/Goodmem-Plugin.git
cd Goodmem-Plugin
npm install && npm run build
claude mcp add goodmem \
  -e GOODMEM_API_KEY=gm_your-api-key \
  -- node build/index.js
```

</details>

### 2. Initialize your project space

In Claude Code, run:

```
/goodmem:setup
```

This creates a memory space for your project with an OpenAI embedder. Requires `OPENAI_API_KEY` to be set on first run (for embedding generation).

### 3. Start using memory

```
/goodmem:ingest docs/architecture.md        # Store a doc
/goodmem:search how does authentication work # Recall context
/goodmem:memories                            # See what's stored
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

The plugin exposes 15 MCP tools organized into four categories.

### Setup

| Tool | Description |
|------|-------------|
| `setup_space` | Initialize a project space with an embedder and chunking config |
| `register_llm` | Register an LLM via OpenRouter for smart search synthesis |
| `health_check` | Check if the Goodmem server is reachable |

### Ingest

| Tool | Description |
|------|-------------|
| `ingest_document` | Ingest a single markdown file into project memory |
| `ingest_directory` | Bulk ingest all matching files from a directory (default: `**/*.md`) |

### Search

| Tool | Description |
|------|-------------|
| `search_memory` | Semantic search — returns ranked chunks with relevance scores |
| `smart_search` | LLM-powered search — returns a synthesized natural language answer (requires `OPENROUTER_API_KEY`) |

### Manage

| Tool | Description |
|------|-------------|
| `list_memories` | List all ingested documents in the current space |
| `get_memory` | Get full details and processing status of a memory |
| `get_memory_content` | Download the original text content of a memory |
| `delete_memory` | Delete a single memory by ID |
| `batch_delete_memories` | Delete multiple memories at once |
| `list_spaces` | List all accessible spaces |
| `delete_space` | Permanently delete a space and all its memories |
| `update_space` | Update a space's name or public-read permissions |

## MCP Prompts

The plugin also registers 2 MCP prompts — reusable prompt templates that Claude can invoke:

| Prompt | Description |
|--------|-------------|
| `ingest_project_docs` | Ingest all markdown from a docs directory (default: `./docs`). Runs `setup_space` then `ingest_directory`. |
| `feature_context` | Search memory for all context about a specific feature — architecture, implementation details, history. |

## Slash Commands

### Simple Commands

Direct shortcuts that map to a single MCP tool:

| Command | What it does | Example |
|---------|--------------|---------|
| `/goodmem:setup [name]` | Create a memory space for this project | `/goodmem:setup` or `/goodmem:setup my-project` |
| `/goodmem:search <query>` | Semantic search over project memory | `/goodmem:search how does auth work` |
| `/goodmem:smart <query>` | LLM-synthesized answer from memory | `/goodmem:smart what patterns does the API use` |
| `/goodmem:ingest <path>` | Ingest a single file | `/goodmem:ingest docs/auth.md` |
| `/goodmem:recall <id>` | Retrieve the full content of a memory | `/goodmem:recall abc-123` |
| `/goodmem:memories` | List all ingested documents | `/goodmem:memories` |
| `/goodmem:spaces` | List all memory spaces | `/goodmem:spaces` |

### Workflow Commands

Multi-step skills that combine several tools:

| Command | What it does |
|---------|--------------|
| `/goodmem:ingest-docs [path]` | Set up space + bulk ingest all markdown from a directory (default: `./docs`) |
| `/goodmem:save-feature [name]` | Write a feature summary doc to `docs/features/` and ingest it into memory |
| `/goodmem:search-context <query>` | Search memory, synthesize an answer with source citations, and suggest follow-ups |

## Recommended Workflow

1. **First time in a project** — Run `/goodmem:setup` to create the memory space, then `/goodmem:ingest-docs` to bulk-load existing docs
2. **Before starting work** — Run `/goodmem:search` (or `/goodmem:search-context`) to pull in relevant prior context
3. **After completing work** — Run `/goodmem:save-feature` to document what was built and why, so future sessions can recall it

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
skills/                   # Claude Code slash commands (SKILL.md files)
.claude-plugin/           # Plugin manifest, marketplace config, MCP server config
docs/                     # Architecture documentation
```

## License

[MIT](LICENSE)
