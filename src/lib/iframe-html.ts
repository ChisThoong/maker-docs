/**
 * Prepare authored HTML for sandboxed iframe rendering (srcDoc).
 * Fixes in-page anchor links (#section) navigating the parent Next.js URL
 * instead of scrolling inside the document.
 */
export function prepareIframeHtml(raw: string): string {
  const scrollFix = `<script>(function(){document.addEventListener("click",function(e){var a=e.target.closest("a");if(!a)return;var h=a.getAttribute("href");if(!h||h.charAt(0)!=="#"||h.length<2)return;var id;try{id=decodeURIComponent(h.slice(1));}catch(_){id=h.slice(1);}var el=document.getElementById(id);if(!el&&id&&typeof CSS!=="undefined"&&CSS.escape)el=document.querySelector('[name="'+CSS.escape(id)+'"]');if(el){e.preventDefault();el.scrollIntoView({behavior:"smooth",block:"start"});}},true);})();<\/script>`;
  const base = '<base target="_self">';
  const scrollbarStyle = `<style>html{color-scheme:dark;}*{scrollbar-width:thin;scrollbar-color:#334155 #060a14;}*::-webkit-scrollbar{width:10px;height:10px;}*::-webkit-scrollbar-track{background:#060a14;}*::-webkit-scrollbar-thumb{background:#334155;border-radius:999px;border:2px solid #060a14;}*::-webkit-scrollbar-thumb:hover{background:#475569;}<\/style>`;
  const headInject = `<meta charset="utf-8">${base}${scrollbarStyle}${scrollFix}`;

  const trimmed = raw.trim();
  if (!trimmed) {
    return `<!DOCTYPE html><html><head>${headInject}</head><body></body></html>`;
  }

  if (/<html[\s>]/i.test(trimmed)) {
    if (/<head[\s>]/i.test(trimmed)) {
      return trimmed.replace(/<head([^>]*)>/i, `<head$1>${headInject}`);
    }
    return trimmed.replace(
      /<html([^>]*)>/i,
      `<html$1><head>${headInject}</head>`
    );
  }

  return `<!DOCTYPE html><html><head>${headInject}</head><body>${trimmed}</body></html>`;
}
