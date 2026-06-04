import type { DocFileMeta, FileKind } from "./types";

export function fileKindFromMime(mimeType: string, name = ""): FileKind {
  const lowerName = name.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime.startsWith("video/")) return "video";
  if (lowerMime.startsWith("audio/")) return "audio";
  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) return "pdf";
  if (
    /word|excel|powerpoint|officedocument|msword|ms-excel|ms-powerpoint/.test(
      lowerMime
    ) ||
    /\.(docx?|xlsx?|pptx?)$/.test(lowerName)
  ) {
    return "office";
  }
  return "other";
}

export function iconForFileKind(kind: FileKind): string {
  if (kind === "image") return "lucide:image";
  if (kind === "video") return "lucide:video";
  if (kind === "audio") return "lucide:music";
  if (kind === "pdf") return "lucide:file-text";
  if (kind === "office") return "lucide:file-spreadsheet";
  return "lucide:file";
}

export function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || name;
}

export function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function makeFileMeta(file: File, url: string): DocFileMeta {
  return {
    url,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    kind: fileKindFromMime(file.type, file.name),
    uploadedAt: new Date().toISOString(),
  };
}
