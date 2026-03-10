import path from "node:path";

const EXTENSION_MAP: Record<string, string> = {
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".ts": "text/typescript",
  ".js": "text/javascript",
  ".py": "text/x-python",
  ".json": "application/json",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".html": "text/html",
  ".css": "text/css",
};

export function detectContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext] ?? "text/plain";
}

export function isTextBased(contentType: string): boolean {
  return contentType.startsWith("text/") || contentType === "application/json";
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function isPdf(contentType: string): boolean {
  return contentType === "application/pdf";
}
