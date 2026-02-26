import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { Agent } from "undici";
import { GoodmemClient } from "../src/goodmem-client.js";

// ── Config ──────────────────────────────────────────────────────────────────

const API_KEY = process.env.GOODMEM_API_KEY;
const API_URL = process.env.GOODMEM_API_URL || "https://localhost:8080";

// Skip all tests if no API key is set
const describeIntegration = API_KEY ? describe : describe.skip;

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeClient(): GoodmemClient {
  const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  return new GoodmemClient({
    apiUrl: API_URL,
    apiKey: API_KEY!,
    dispatcher,
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describeIntegration("Goodmem MCP Integration Tests", () => {
  let client: GoodmemClient;
  let tmpDir: string;

  // IDs to track for cleanup
  let testSpaceId: string;
  const createdMemoryIds: string[] = [];

  beforeAll(async () => {
    client = makeClient();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "goodmem-test-"));
  });

  afterAll(async () => {
    // Clean up: delete test memories
    for (const id of createdMemoryIds) {
      try {
        await client.deleteMemory(id);
      } catch {
        // Ignore — may already be deleted by tests
      }
    }

    // Clean up: delete test space
    if (testSpaceId) {
      try {
        await client.deleteSpace(testSpaceId);
      } catch {
        // Ignore
      }
    }

    // Clean up: remove temp files
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ── 1. Health Check ───────────────────────────────────────────────────

  it("should verify the Goodmem API is reachable", async () => {
    const healthy = await client.ping();
    expect(healthy).toBe(true);
  });

  // ── 2. List Spaces ────────────────────────────────────────────────────

  it("should list existing spaces", async () => {
    const spaces = await client.listSpaces();
    expect(Array.isArray(spaces)).toBe(true);
    // The user said they have a space set up, so we expect at least 1
    expect(spaces.length).toBeGreaterThanOrEqual(1);

    // Each space should have required fields
    const space = spaces[0];
    expect(space.spaceId).toBeDefined();
    expect(space.name).toBeDefined();
  });

  // ── 3. List Embedders ─────────────────────────────────────────────────

  it("should list existing embedders", async () => {
    const embedders = await client.listEmbedders();
    expect(Array.isArray(embedders)).toBe(true);
    // If a space exists, there should be at least one embedder
    expect(embedders.length).toBeGreaterThanOrEqual(1);
  });

  // ── 4. Create Test Space ──────────────────────────────────────────────

  it("should create a test space", async () => {
    const embedders = await client.listEmbedders();
    expect(embedders.length).toBeGreaterThanOrEqual(1);

    const space = await client.createSpace({
      name: `goodmem-integration-test-${Date.now()}`,
      defaultChunkingConfig: {
        recursive: { chunkSize: 500, chunkOverlap: 100 },
      },
      spaceEmbedders: [{ embedderId: embedders[0].embedderId }],
    });

    expect(space.spaceId).toBeDefined();
    expect(space.name).toContain("goodmem-integration-test-");
    testSpaceId = space.spaceId;
  });

  // ── 5. Get Space ──────────────────────────────────────────────────────

  it("should get a space by ID", async () => {
    const space = await client.getSpace(testSpaceId);
    expect(space.spaceId).toBe(testSpaceId);
    expect(space.name).toContain("goodmem-integration-test-");
  });

  // ── 6. Update Space ───────────────────────────────────────────────────

  it("should update a space name", async () => {
    const newName = `goodmem-integration-test-updated-${Date.now()}`;
    const updated = await client.updateSpace(testSpaceId, { name: newName });
    expect(updated.name).toBe(newName);
  });

  // ── 7. Create Memory (single document) ────────────────────────────────

  it("should ingest a single document", async () => {
    const content = `# Test Document\n\nThis is a test document about authentication flow.\nThe login endpoint uses JWT tokens stored in HTTP-only cookies.\nSession expiry is configurable via the AUTH_TIMEOUT environment variable.`;

    const memory = await client.createMemory({
      spaceId: testSpaceId,
      originalContent: content,
      contentType: "text/markdown",
      metadata: {
        filePath: "/test/auth-design.md",
        fileName: "auth-design.md",
        ingestedAt: new Date().toISOString(),
      },
    });

    expect(memory.memoryId).toBeDefined();
    expect(memory.spaceId).toBe(testSpaceId);
    createdMemoryIds.push(memory.memoryId);
  });

  // ── 8. Batch Create Memories ──────────────────────────────────────────

  it("should batch create multiple memories", async () => {
    // Write temp files for realistic test
    const files = [
      {
        name: "api-design.md",
        content: `# API Design\n\nREST endpoints follow OpenAPI 3.0 spec.\nAll endpoints require Bearer token authentication.\nRate limiting is set to 100 requests per minute.`,
      },
      {
        name: "database-schema.md",
        content: `# Database Schema\n\nUsing PostgreSQL with pgvector extension.\nPrimary tables: users, sessions, documents.\nAll tables have created_at and updated_at timestamps.`,
      },
    ];

    for (const f of files) {
      await fs.writeFile(path.join(tmpDir, f.name), f.content);
    }

    const results = await client.createMemoriesBatch(
      files.map((f) => ({
        spaceId: testSpaceId,
        originalContent: f.content,
        contentType: "text/markdown",
        metadata: {
          filePath: path.join(tmpDir, f.name),
          fileName: f.name,
          ingestedAt: new Date().toISOString(),
        },
      }))
    );

    expect(results.length).toBe(2);
    for (const result of results) {
      expect(
        result.success === true || result.success === "true"
      ).toBe(true);
      const memId = result.memoryId ?? result.memory?.memoryId;
      expect(memId).toBeDefined();
      createdMemoryIds.push(memId!);
    }
  });

  // ── 9. List Memories ──────────────────────────────────────────────────

  it("should list memories in the test space", async () => {
    const memories = await client.listMemories(testSpaceId);
    expect(memories.length).toBe(3); // 1 single + 2 batch
    for (const m of memories) {
      expect(m.memoryId).toBeDefined();
      expect(m.spaceId).toBe(testSpaceId);
    }
  });

  // ── 10. Get Memory ────────────────────────────────────────────────────

  it("should get memory details by ID", async () => {
    const memoryId = createdMemoryIds[0];
    const memory = await client.getMemory(memoryId);

    expect(memory.memoryId).toBe(memoryId);
    expect(memory.spaceId).toBe(testSpaceId);
    expect(memory.contentType).toBe("text/markdown");

    // Metadata should contain what we set
    const meta =
      typeof memory.metadata === "string"
        ? JSON.parse(memory.metadata)
        : memory.metadata;
    expect(meta.fileName).toBe("auth-design.md");
    expect(meta.filePath).toBe("/test/auth-design.md");
    expect(meta.ingestedAt).toBeDefined();
  });

  // ── 11. Get Memory Content ────────────────────────────────────────────

  it("should download the original content of a memory", async () => {
    const memoryId = createdMemoryIds[0];
    const content = await client.getMemoryContent(memoryId);

    expect(content).toContain("# Test Document");
    expect(content).toContain("authentication flow");
    expect(content).toContain("JWT tokens");
  });

  // ── 12. Search Memory ─────────────────────────────────────────────────

  it("should search for relevant memories", async () => {
    // Give a moment for vectors to be indexed
    await new Promise((r) => setTimeout(r, 3000));

    const result = await client.retrieveMemories({
      spaceId: testSpaceId,
      message: "How does authentication work?",
      requestedSize: 5,
    });

    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);

    // Verify result structure
    const item = result.items[0];
    expect(item.chunk).toBeDefined();
    expect(item.chunk.relevanceScore).toBeDefined();
    expect(item.chunk.chunk.chunkText).toBeDefined();
    expect(item.chunk.chunk.memoryId).toBeDefined();
  });

  // ── 13. Delete Single Memory ──────────────────────────────────────────

  it("should delete a single memory", async () => {
    const memoryId = createdMemoryIds[0];
    await client.deleteMemory(memoryId);

    // Verify it's gone
    await expect(client.getMemory(memoryId)).rejects.toThrow();

    // Remove from tracking so afterAll doesn't try again
    createdMemoryIds.splice(0, 1);
  });

  // ── 14. Batch Delete Memories ─────────────────────────────────────────

  it("should batch delete remaining memories", async () => {
    const result = await client.batchDeleteMemories(
      createdMemoryIds.map((memoryId) => ({ memoryId }))
    );

    expect(result.results).toBeDefined();
    const succeeded = result.results.filter(
      (r) => r.success === true || r.success === "true"
    ).length;
    expect(succeeded).toBe(createdMemoryIds.length);

    // Clear tracking
    createdMemoryIds.length = 0;
  });

  // ── 15. Delete Test Space ─────────────────────────────────────────────

  it("should delete the test space", async () => {
    await client.deleteSpace(testSpaceId);

    // Verify it's gone
    await expect(client.getSpace(testSpaceId)).rejects.toThrow();

    // Clear so afterAll doesn't try again
    testSpaceId = undefined as unknown as string;
  });

  // ── Error Handling ────────────────────────────────────────────────────

  describe("Error handling", () => {
    it("should fail gracefully for a non-existent memory ID", async () => {
      await expect(
        client.getMemory("00000000-0000-0000-0000-000000000000")
      ).rejects.toThrow();
    });

    it("should fail gracefully for a non-existent space ID", async () => {
      await expect(
        client.getSpace("00000000-0000-0000-0000-000000000000")
      ).rejects.toThrow();
    });

    it("should fail gracefully for deleting a non-existent memory", async () => {
      await expect(
        client.deleteMemory("00000000-0000-0000-0000-000000000000")
      ).rejects.toThrow();
    });
  });
});
