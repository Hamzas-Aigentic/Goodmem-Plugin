---
name: goodmem:search-context
description: Search project memory for relevant context about features, decisions, and implementation details
---

Search the project's Goodmem memory space for documentation and context relevant to the user's query.

Follow these steps:

1. Call `setup_space` to ensure a memory space exists for this project. If one already exists, it will be reused.

2. Call `search_memory` with the query from $ARGUMENTS. Use the full text of the user's question as the search query for best results.

3. Synthesize a clear, direct answer from the retrieved results:
   - Combine information from multiple chunks into a coherent response.
   - Cite which memory IDs the answer draws from so the user can trace the source.
   - Highlight the most relevant findings first.

4. If the search results do not fully answer the question:
   - State what was found and what information is missing.
   - Suggest alternative search terms the user could try.
   - Recommend ingesting additional documentation if the topic appears undocumented.
