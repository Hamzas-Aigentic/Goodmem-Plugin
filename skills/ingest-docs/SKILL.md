---
name: ingest-docs
description: Ingest project documentation into Goodmem memory for semantic search and retrieval
---

Ingest markdown documentation files into the project's Goodmem memory space.

Follow these steps:

1. Call `setup_space` to ensure a memory space exists for this project. If one already exists, it will be reused.

2. Determine the target directory to ingest:
   - If the user provided a path via $ARGUMENTS, use that path.
   - Otherwise, default to `./docs` relative to the current working directory.

3. Call `ingest_directory` with the resolved directory path. Use the default `**/*.md` pattern unless the user specified a different file pattern.

4. Report the results to the user:
   - Total number of files ingested.
   - The memory ID for each ingested file.
   - If no files were found, suggest checking the directory path or file pattern.
