/** Pull a full HTML document out of an LLM reply (with or without markdown fences). */
export function extractHtmlFromResponse(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("empty_response");

  const fenced = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  if (/<!DOCTYPE[\s>]/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    const doc =
      trimmed.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i)?.[1] ??
      trimmed.match(/(<html[\s\S]*?<\/html>)/i)?.[1];
    if (doc) return doc.trim();
    return trimmed;
  }

  throw new Error("invalid_html");
}
