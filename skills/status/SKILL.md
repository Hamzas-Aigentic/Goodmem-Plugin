---
name: goodmem:status
description: Show the current Goodmem configuration and memory status for this project
---

Display the current Goodmem setup status for this project.

## Steps

1. Call `health_check` to verify server connectivity.

2. Call `status` to get the full configuration summary.

3. Display the results in a clean format:
   ```
   Goodmem Status
   ──────────────────────────────
   Server:     <url> (<healthy/unreachable>)
   Space:      <name> (<id>)
   Memories:   <count> documents
   Chunking:   <strategy> (<size> chars, <overlap> overlap)
   Embedder:   <name>
   Reranker:   <name> or "not configured"
   LLM:        <name> or "not configured"
   ```

4. If no space is found, suggest: "Run `/goodmem:setup` to initialize Goodmem for this project."
