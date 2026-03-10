---
name: goodmem:ingest
description: Ingest a single file into project memory with auto-extracted metadata
---

Ingest a file into project memory. The file path comes from $ARGUMENTS.

## Steps

1. **Read the file** to understand its content.

2. **Auto-extract metadata** by analyzing the content:
   - `type`: Classify as one of: decision, architecture, bugfix, feature, changelog, config, api
   - `tags`: Extract 2-5 relevant keyword tags from headings, key terms, and topics
   - `module`: Identify the primary module/component/feature from the file path or content
   - `date`: Use the current date (ISO 8601 format) unless the document contains an explicit date
   - `author`: Check git blame or document headers if available, otherwise omit
   - `status`: Default to "active"
   - `summary`: Write a concise one-line summary of the document

3. **Show the user** the extracted metadata for confirmation:
   ```
   File: <filename>
   Type: <type>
   Tags: <tags>
   Module: <module>
   Date: <date>
   Status: <status>
   Summary: <summary>
   ```
   Ask: "Does this look right? I can adjust any fields before ingesting."

4. **Call `ingest_document`** with the file path and confirmed metadata object.

5. **Report success** with the memory ID.
