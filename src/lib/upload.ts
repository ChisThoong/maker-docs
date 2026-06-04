/**
 * Image upload helpers — uploads directly from the browser to the shared
 * Maker Studios file server (same backend as grok-chat-ai), which stores the
 * file on disk and returns a public URL. We persist only the URL string.
 */

import type { SpineBundleMeta } from "./types";

const SERVER_URL = process.env.NEXT_PUBLIC_UPLOAD_SERVER_URL ?? "";
const SERVER_KEY = process.env.NEXT_PUBLIC_UPLOAD_SERVER_KEY ?? "";
const DIRECT_UPLOAD_LIMIT = 18 * 1024 * 1024;
const CHUNK_SIZE = 8 * 1024 * 1024;

/** Upload a base64 data URL and return the public file URL. */
export async function uploadToServer(
  dataUrl: string,
  filename: string
): Promise<string> {
  if (!SERVER_URL) throw new Error("Missing NEXT_PUBLIC_UPLOAD_SERVER_URL");

  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error("Invalid image data");
  const contentType = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: contentType }), filename);

  const res = await fetch(`${SERVER_URL.replace(/\/+$/, "")}/upload`, {
    method: "POST",
    headers: SERVER_KEY ? { "x-api-key": SERVER_KEY } : undefined,
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status})${msg ? `: ${msg}` : ""}`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data?.url) throw new Error("Server did not return an image URL");
  return data.url;
}

async function uploadFileDirect(file: File): Promise<string> {
  if (!SERVER_URL) throw new Error("Missing NEXT_PUBLIC_UPLOAD_SERVER_URL");

  const form = new FormData();
  form.append("file", file, file.name);

  const res = await fetch(`${SERVER_URL.replace(/\/+$/, "")}/upload`, {
    method: "POST",
    headers: SERVER_KEY ? { "x-api-key": SERVER_KEY } : undefined,
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status})${msg ? `: ${msg}` : ""}`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data?.url) throw new Error("Server did not return a file URL");
  return data.url;
}

async function uploadFileInChunks(file: File): Promise<string> {
  if (!SERVER_URL) throw new Error("Missing NEXT_PUBLIC_UPLOAD_SERVER_URL");

  const uploadId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let finalUrl = "";

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const form = new FormData();
    form.append("uploadId", uploadId);
    form.append("filename", file.name);
    form.append("mimeType", file.type || "application/octet-stream");
    form.append("chunkIndex", String(chunkIndex));
    form.append("totalChunks", String(totalChunks));
    form.append("totalSize", String(file.size));
    form.append("chunk", file.slice(start, end), `${file.name}.part${chunkIndex}`);

    const res = await fetch(`${SERVER_URL.replace(/\/+$/, "")}/upload-chunk`, {
      method: "POST",
      headers: SERVER_KEY ? { "x-api-key": SERVER_KEY } : undefined,
      body: form,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Chunk upload failed (${res.status})${msg ? `: ${msg}` : ""}`);
    }
    const data = (await res.json()) as {
      complete?: boolean;
      url?: string;
      message?: string;
    };
    if (data.complete && data.url) finalUrl = data.url;
  }

  if (!finalUrl) throw new Error("Server did not finish chunked upload");
  return finalUrl;
}

/** Read a File and upload it; returns the public URL. */
export function uploadFile(file: File): Promise<string> {
  return file.size > DIRECT_UPLOAD_LIMIT
    ? uploadFileInChunks(file)
    : uploadFileDirect(file);
}

export async function uploadSpineBundle(files: File[]): Promise<SpineBundleMeta> {
  if (!SERVER_URL) throw new Error("Missing NEXT_PUBLIC_UPLOAD_SERVER_URL");
  if (!files.length) throw new Error("Choose Spine files to upload");

  const form = new FormData();
  for (const file of files) {
    form.append("files", file, file.name);
  }

  const res = await fetch(`${SERVER_URL.replace(/\/+$/, "")}/upload-bundle`, {
    method: "POST",
    headers: SERVER_KEY ? { "x-api-key": SERVER_KEY } : undefined,
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Bundle upload failed (${res.status})${msg ? `: ${msg}` : ""}`);
  }
  const data = (await res.json()) as Partial<SpineBundleMeta> & {
    success?: boolean;
    message?: string;
  };
  if (!data?.bundleId || !data.jsonUrl || !data.atlasUrl) {
    throw new Error(data.message || "Server did not return a Spine bundle");
  }
  return {
    bundleId: data.bundleId,
    name: data.name || data.bundleId,
    baseUrl: data.baseUrl || "",
    jsonUrl: data.jsonUrl,
    atlasUrl: data.atlasUrl,
    textureUrls: data.textureUrls ?? [],
    files: data.files ?? [],
    uploadedAt: new Date().toISOString(),
  };
}

/** Resolve a possibly-relative stored value into an absolute URL. */
export function resolveUploadUrl(value?: string | null): string {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  if (value.startsWith("/")) {
    return SERVER_URL ? `${SERVER_URL.replace(/\/+$/, "")}${value}` : value;
  }
  return value;
}
