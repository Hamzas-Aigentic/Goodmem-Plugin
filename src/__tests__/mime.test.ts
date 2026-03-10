import { describe, it, expect } from "vitest";
import { detectContentType, isTextBased, isImage, isPdf } from "../mime.js";

describe("detectContentType", () => {
  const cases: [string, string][] = [
    [".md", "text/markdown"],
    [".txt", "text/plain"],
    [".ts", "text/x-typescript"],
    [".js", "text/x-javascript"],
    [".py", "text/x-python"],
    [".json", "application/json"],
    [".yaml", "text/yaml"],
    [".yml", "text/yaml"],
    [".pdf", "application/pdf"],
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".html", "text/html"],
    [".css", "text/css"],
  ];

  it.each(cases)("returns correct MIME for %s", (ext, expected) => {
    expect(detectContentType(`file${ext}`)).toBe(expected);
  });

  it("returns text/plain for unknown extensions", () => {
    expect(detectContentType("file.xyz")).toBe("text/plain");
    expect(detectContentType("file.unknown")).toBe("text/plain");
  });
});

describe("isTextBased", () => {
  it("returns true for text/* types", () => {
    expect(isTextBased("text/plain")).toBe(true);
    expect(isTextBased("text/markdown")).toBe(true);
    expect(isTextBased("text/html")).toBe(true);
  });

  it("returns true for application/json", () => {
    expect(isTextBased("application/json")).toBe(true);
  });

  it("returns false for image/* types", () => {
    expect(isTextBased("image/png")).toBe(false);
    expect(isTextBased("image/jpeg")).toBe(false);
  });

  it("returns false for application/pdf", () => {
    expect(isTextBased("application/pdf")).toBe(false);
  });
});

describe("isImage", () => {
  it("returns true for image/png", () => {
    expect(isImage("image/png")).toBe(true);
  });

  it("returns true for image/jpeg", () => {
    expect(isImage("image/jpeg")).toBe(true);
  });

  it("returns false for non-image types", () => {
    expect(isImage("text/plain")).toBe(false);
    expect(isImage("application/pdf")).toBe(false);
  });
});

describe("isPdf", () => {
  it("returns true for application/pdf", () => {
    expect(isPdf("application/pdf")).toBe(true);
  });

  it("returns false for non-pdf types", () => {
    expect(isPdf("text/plain")).toBe(false);
    expect(isPdf("image/png")).toBe(false);
  });
});
