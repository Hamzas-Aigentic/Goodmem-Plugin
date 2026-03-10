import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs");

import fs from "node:fs";
import {
  loadPersistedConfig,
  savePersistedConfig,
  getEffectiveSpaceId,
  getConfig,
  setResolvedSpaceId,
  getResolvedSpaceId,
  setResolvedRerankerId,
  getResolvedRerankerId,
  setResolvedLlmId,
  getResolvedLlmId,
  setResolvedEmbedderId,
  getResolvedEmbedderId,
} from "../config.js";

const mockedFs = vi.mocked(fs);

describe("config", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset runtime state by setting to known values
    // We'll use the setters to reset them
    process.env = { ...savedEnv };
    process.env.GOODMEM_API_KEY = "test-key";
    delete process.env.GOODMEM_SPACE_ID;
    delete process.env.COHERE_API_KEY;
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  describe("loadPersistedConfig", () => {
    it("returns null when no file exists", () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      expect(loadPersistedConfig()).toBeNull();
    });

    it("returns parsed config when file exists", () => {
      const config = { spaceId: "sp-123", rerankerId: "rr-456" };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(config));
      expect(loadPersistedConfig()).toEqual(config);
    });
  });

  describe("savePersistedConfig", () => {
    it("writes JSON to .goodmem.json", () => {
      const config = { spaceId: "sp-123", chunkingPreset: "mixed" };
      savePersistedConfig(config);
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
      const [filePath, content] = mockedFs.writeFileSync.mock.calls[0];
      expect(String(filePath)).toContain(".goodmem.json");
      expect(JSON.parse(String(content))).toEqual(config);
    });
  });

  describe("getEffectiveSpaceId", () => {
    it("returns env var first (highest priority)", () => {
      process.env.GOODMEM_SPACE_ID = "env-space";
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ spaceId: "persisted-space" })
      );
      setResolvedSpaceId("runtime-space");
      expect(getEffectiveSpaceId()).toBe("env-space");
    });

    it("returns persisted config when no env var", () => {
      delete process.env.GOODMEM_SPACE_ID;
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ spaceId: "persisted-space" })
      );
      expect(getEffectiveSpaceId()).toBe("persisted-space");
    });

    it("returns runtime state when no env var or persisted", () => {
      delete process.env.GOODMEM_SPACE_ID;
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      setResolvedSpaceId("runtime-space");
      expect(getEffectiveSpaceId()).toBe("runtime-space");
    });
  });

  describe("getConfig", () => {
    it("includes cohereApiKey from env", () => {
      process.env.COHERE_API_KEY = "cohere-key-123";
      const config = getConfig();
      expect(config.cohereApiKey).toBe("cohere-key-123");
    });

    it("throws if GOODMEM_API_KEY is not set", () => {
      delete process.env.GOODMEM_API_KEY;
      expect(() => getConfig()).toThrow("GOODMEM_API_KEY");
    });
  });

  describe("runtime setters/getters", () => {
    it("setResolvedSpaceId / getResolvedSpaceId", () => {
      setResolvedSpaceId("sp-abc");
      expect(getResolvedSpaceId()).toBe("sp-abc");
    });

    it("setResolvedRerankerId / getResolvedRerankerId", () => {
      setResolvedRerankerId("rr-abc");
      expect(getResolvedRerankerId()).toBe("rr-abc");
    });

    it("setResolvedLlmId / getResolvedLlmId", () => {
      setResolvedLlmId("llm-abc");
      expect(getResolvedLlmId()).toBe("llm-abc");
    });

    it("setResolvedEmbedderId / getResolvedEmbedderId", () => {
      setResolvedEmbedderId("emb-abc");
      expect(getResolvedEmbedderId()).toBe("emb-abc");
    });
  });
});
