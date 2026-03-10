import { describe, it, expect } from "vitest";
import {
  CHUNKING_PRESETS,
  resolveChunkingConfig,
} from "../chunking-presets.js";

describe("CHUNKING_PRESETS", () => {
  it("has short-docs preset with correct values", () => {
    const preset = CHUNKING_PRESETS["short-docs"];
    expect(preset).toBeDefined();
    expect(preset.recursive?.chunkSize).toBe(500);
    expect(preset.recursive?.chunkOverlap).toBe(100);
  });

  it("has long-docs preset with correct values", () => {
    const preset = CHUNKING_PRESETS["long-docs"];
    expect(preset).toBeDefined();
    expect(preset.recursive?.chunkSize).toBe(1000);
    expect(preset.recursive?.chunkOverlap).toBe(200);
  });

  it("has mixed preset with correct values", () => {
    const preset = CHUNKING_PRESETS["mixed"];
    expect(preset).toBeDefined();
    expect(preset.recursive?.chunkSize).toBe(800);
    expect(preset.recursive?.chunkOverlap).toBe(150);
  });

  it("has code-heavy preset with correct values", () => {
    const preset = CHUNKING_PRESETS["code-heavy"];
    expect(preset).toBeDefined();
    expect(preset.recursive?.chunkSize).toBe(600);
    expect(preset.recursive?.chunkOverlap).toBe(120);
    expect(preset.recursive?.separators).toEqual(["\n\n", "\n", ". ", " "]);
  });
});

describe("resolveChunkingConfig", () => {
  it("returns the mixed preset for 'mixed'", () => {
    const config = resolveChunkingConfig("mixed");
    expect(config).toEqual(CHUNKING_PRESETS["mixed"]);
  });

  it("returns the mixed preset when undefined (default)", () => {
    const config = resolveChunkingConfig(undefined);
    expect(config).toEqual(CHUNKING_PRESETS["mixed"]);
  });

  it("returns custom config when provided", () => {
    const custom = { recursive: { chunkSize: 999, chunkOverlap: 50 } };
    const config = resolveChunkingConfig(undefined, custom);
    expect(config).toEqual(custom);
  });

  it("returns short-docs preset", () => {
    const config = resolveChunkingConfig("short-docs");
    expect(config).toEqual(CHUNKING_PRESETS["short-docs"]);
  });
});
