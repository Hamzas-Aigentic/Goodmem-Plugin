---
name: save-feature
description: Save a summary of completed work to Goodmem memory for future reference
---

Create a feature document summarizing recently completed work and store it in Goodmem memory.

Follow these steps:

1. Determine the feature name from $ARGUMENTS. If no name was provided, infer a short descriptive name from the recent conversation context.

2. Write a markdown document to `docs/features/<feature-name>.md` with the following sections:
   - **What was built**: A concise summary of the feature, bug fix, or change.
   - **Why**: The motivation or problem that prompted this work.
   - **How**: Key implementation details, patterns used, and important files modified.
   - **Trade-offs and decisions**: Any notable design choices or alternatives considered.
   - **Dependencies**: External libraries, services, or internal modules this work depends on.

3. Call `setup_space` to ensure a memory space exists for this project.

4. Call `ingest_document` with the absolute path to the newly created markdown file.

5. Confirm to the user that the feature was saved, including:
   - The file path of the created document.
   - The memory ID returned by Goodmem.
