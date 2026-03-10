---
name: goodmem:setup
description: Initialize a memory space for this project with guided configuration
---

Guide the user through setting up Goodmem for their project. Follow these phases:

## Fast Path
If $ARGUMENTS contains "defaults", "quick", or "just use defaults", skip to the Execute phase using:
- Chunking preset: "mixed" (recursive, 800 chars, 150 overlap)
- Use whatever API keys are available in the environment
- Project name: current directory name

## Phase 1: Project Understanding
Ask the user ONE practical question:

"What kind of documents will you primarily store in project memory?"
- **Short decision records & notes** → use chunking preset "short-docs"
- **Long architecture docs & design specs** → use chunking preset "long-docs"
- **A mix of both** → use chunking preset "mixed"
- **Code-heavy documentation with snippets** → use chunking preset "code-heavy"

If the user says "let me customize" or asks about technical details, explain the chunking parameters (chunk size, overlap, strategy) and let them specify values directly via `chunkSize`, `chunkOverlap`, and `separators` parameters on `setup_space`.

## Phase 2: API Key Detection
Check which features can be configured by calling `health_check` first, then report:
- "OpenAI embeddings: ✓ ready" (if OPENAI_API_KEY is set — required)
- "Cohere reranking: ✓ ready" or "⚠ no COHERE_API_KEY — search quality will be basic"
- "OpenRouter LLM: ✓ ready" or "⚠ no OPENROUTER_API_KEY — smart search won't be available"

If OPENAI_API_KEY is missing, stop and tell the user it's required.

## Phase 3: Execute
1. Call `setup_space` with the selected chunking preset (pass as `chunkingPreset` parameter) and optional project name
2. If COHERE_API_KEY is available, call `register_reranker` to set up search reranking
3. If OPENROUTER_API_KEY is available, call `register_llm` to enable smart search

## Phase 4: Summary
Display what was configured:
- Space name and ID
- Chunking strategy selected
- Embedder: OpenAI text-embedding-3-small
- Reranker: configured/not configured
- LLM: configured/not configured

Suggest next step: "Run `/goodmem:ingest-docs` to add your project documentation."
