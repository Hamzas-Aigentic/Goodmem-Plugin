---
name: goodmem:ingest-docs
description: Ingest project documentation into Goodmem memory for semantic search and retrieval
---

Bulk ingest documentation files from a directory into project memory.

## Steps

1. **Determine the directory** from $ARGUMENTS. Default to `./docs` if not specified.

2. **Discover files** by listing the directory contents to identify documentation files (markdown, text, code, config files, etc.). If the user specified a file type, filter accordingly.

3. **For small batches (≤20 files)**, show a preview table with auto-detected metadata:
   ```
   | File | Type | Tags | Module | Status |
   |------|------|------|--------|--------|
   | auth-design.md | architecture | auth, security | auth | active |
   | payment-bug.md | bugfix | payment, stripe | billing | active |
   ```
   Ask the user to confirm or adjust before proceeding.

4. **For large batches (>20 files)**, show a summary:
   "Found 47 files. I'll auto-detect metadata for each. Proceed with auto-detection, or would you like to review a sample first?"

5. **Execute ingestion** by calling `ingest_directory` with the directory path and an appropriate glob pattern to ingest all matching files in a single call.

6. **Report results**: number of files ingested, any failures, and total memory count.
