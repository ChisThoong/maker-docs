import DOMPurify from "isomorphic-dompurify";

const ADD_TAGS = ["iframe", "style"];
const ADD_ATTR = [
  "target",
  "allow",
  "allowfullscreen",
  "frameborder",
  "scrolling",
  "loading",
  "style",
];

let hookInstalled = false;

function installHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  // Strip iframes whose src is not an absolute http(s) URL. Relative srcs
  // (e.g. "drop-simulator.html") resolve against our own app and end up
  // loading the Maker Docs UI (sidebar/header) inside the document.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as Element;
    if (el.tagName === "IFRAME") {
      const src = el.getAttribute("src") || "";
      if (!/^https?:\/\//i.test(src)) {
        el.parentNode?.removeChild(el);
        return;
      }
      el.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
      el.setAttribute("loading", "lazy");
    }
  });
}

const STYLE_RE = /<style[\s\S]*?<\/style>/gi;
const BODY_RE = /<body[^>]*>([\s\S]*?)<\/body>/i;

/**
 * Keep the original file's CSS. Lifts every <style> block (including ones in
 * <head>) to the front of the body content so DOMPurify — which only keeps
 * <body> — doesn't drop them. Works for full HTML documents and fragments.
 */
export function normalizeHtml(input: string): string {
  if (!input) return "";
  const styles = (input.match(STYLE_RE) ?? []).join("\n");
  const bodyMatch = input.match(BODY_RE);
  let body = bodyMatch ? bodyMatch[1] : input;
  body = body.replace(STYLE_RE, "");
  return (styles ? styles + "\n" : "") + body;
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  installHook();
  return DOMPurify.sanitize(normalizeHtml(dirty), {
    ADD_TAGS,
    ADD_ATTR,
    FORBID_TAGS: ["script"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}
