/**
 * Prepare authored HTML for sandboxed iframe rendering (srcDoc).
 * Fixes in-page anchor links (#section) navigating the parent Next.js URL
 * instead of scrolling inside the document.
 */
export function prepareIframeHtml(raw: string): string {
  const scrollFix = `<script>(function(){document.addEventListener("click",function(e){var a=e.target.closest("a");if(!a)return;var h=a.getAttribute("href");if(!h||h.charAt(0)!=="#"||h.length<2)return;var id;try{id=decodeURIComponent(h.slice(1));}catch(_){id=h.slice(1);}var el=document.getElementById(id);if(!el&&id&&typeof CSS!=="undefined"&&CSS.escape)el=document.querySelector('[name="'+CSS.escape(id)+'"]');if(el){e.preventDefault();el.scrollIntoView({behavior:"smooth",block:"start"});}},true);})();<\/script>`;
  const base = '<base target="_self">';

  const trimmed = raw.trim();
  if (!trimmed) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${base}${scrollFix}</head><body></body></html>`;
  }

  if (/<html[\s>]/i.test(trimmed)) {
    if (/<head[\s>]/i.test(trimmed)) {
      return trimmed.replace(/<head([^>]*)>/i, `<head$1>${base}${scrollFix}`);
    }
    return trimmed.replace(
      /<html([^>]*)>/i,
      `<html$1><head><meta charset="utf-8">${base}${scrollFix}</head>`
    );
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${base}${scrollFix}</head><body>${trimmed}</body></html>`;
}
