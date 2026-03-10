---
name: goodmem:search
description: Search project memory with a natural language query
---

Search project memory using the query from $ARGUMENTS. Before calling `search_memory`, analyze the query for implicit metadata filters and construct a Goodmem filter expression.

## Filter Construction

Analyze the user's query for these patterns and build filter expressions silently — NEVER show the raw filter to the user:

| User says | Filter expression |
|-----------|-------------------|
| "recent" / "latest" / "last month" | `CAST(val('$.date') AS DATE) > CURRENT_DATE - 30` |
| "decisions" / "decision records" | `val('$.type') = 'decision'` |
| "architecture" / "design docs" | `val('$.type') = 'architecture'` |
| "bug fixes" / "bugs" | `val('$.type') = 'bugfix'` |
| "features" | `val('$.type') = 'feature'` |
| "active" / "current" | `val('$.status') = 'active'` |
| mentions a specific module (e.g., "auth", "payment") | `val('$.tags') CONTAINS ['<module>']` |
| "deprecated" | `val('$.status') = 'deprecated'` |

Combine multiple filters with `AND`. Examples:
- "recent auth decisions" → `val('$.type') = 'decision' AND val('$.tags') CONTAINS ['auth'] AND CAST(val('$.date') AS DATE) > CURRENT_DATE - 30`
- "active architecture docs" → `val('$.status') = 'active' AND val('$.type') = 'architecture'`
- "payment bugs" → `val('$.type') = 'bugfix' AND val('$.tags') CONTAINS ['payment']`

## Filter Expression Syntax Reference

Core functions:
- `val('$.fieldName')` — extract a JSON field from metadata
- `exists('$.fieldName')` — check if a field exists

Operators: `=`, `>=`, `<=`, `ILIKE` (case-insensitive like), `CONTAINS` (array contains), `OVERLAPS` (arrays overlap), `IN`

Casting: `CAST(val('$.field') AS TEXT | DATE | INTEGER | BOOLEAN)`

Date math: `CURRENT_DATE`, `CURRENT_DATE - 30` (days ago)

Boolean: `AND`, `OR`, parentheses for grouping

## Metadata Schema (fields available for filtering)
- `type`: decision, architecture, bugfix, feature, changelog, config, api
- `tags`: string array (e.g., ["auth", "api"])
- `module`: component/feature name
- `date`: ISO 8601 date string
- `status`: active, deprecated, superseded
- `author`: who wrote it
- `summary`: one-line description

## Execution
1. Construct the filter expression (if any implicit filters detected)
2. Call `search_memory` with the query and optional `filter` parameter
3. Synthesize a clear, direct answer from the results — do NOT dump raw chunks
4. If results are empty AND you used a filter, retry WITHOUT the filter and inform the user that broader results were returned
