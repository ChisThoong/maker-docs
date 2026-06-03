/**
 * Image upload helpers — uploads directly from the browser to the shared
 * Maker Studios file server (same backend as grok-chat-ai), which stores the
 * file on disk and returns a public URL. We persist only the URL string.
 */

const SERVER_URL = process.env.NEXT_PUBLIC_UPLOAD_SERVER_URL ?? "";
const SERVER_KEY = process.env.NEXT_PUBLIC_UPLOAD_SERVER_KEY ?? "";

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

/** Read a File and upload it; returns the public URL. */
export function uploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      uploadToServer(String(reader.result), file.name).then(resolve, reject);
    };
    reader.readAsDataURL(file);
  });
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
