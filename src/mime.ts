import path from "node:path";

const EXTENSION_MAP: Record<string, string> = {
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".ts": "text/x-typescript",
  ".js": "text/x-javascript",
  ".py": "text/x-python",
  ".go": "text/x-go",
  ".rs": "text/x-rust",
  ".java": "text/x-java",
  ".rb": "text/x-ruby",
  ".sh": "text/x-shellscript",
  ".json": "application/json",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".html": "text/html",
  ".css": "text/css",
  ".xml": "text/xml",
  ".csv": "text/csv",
  ".c": "text/x-c",
  ".cpp": "text/x-c++",
  ".cc": "text/x-c++",
  ".h": "text/x-c-header",
};

export function detectContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext] ?? "text/plain";
}

export function isTextBased(contentType: string): boolean {
  return (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/yaml" ||
    contentType === "text/yaml"
  );
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function isPdf(contentType: string): boolean {
  return contentType === "application/pdf";
}
