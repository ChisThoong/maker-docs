import type { SpineBundleMeta } from "./types";

export function spineTitleFromFiles(files: File[]): string {
  const data = files.find((f) => /\.(json|skel)$/i.test(f.name));
  const name = data?.name ?? files[0]?.name ?? "Spine Bundle";
  return name.replace(/\.(json|skel)$/i, "").replace(/[-_]+/g, " ").trim();
}

export function validateSpineFiles(files: File[]): string | null {
  if (!files.length) return "Choose Spine files.";
  const names = files.map((f) => f.name.toLowerCase());
  const hasData = names.some((n) => n.endsWith(".json") || n.endsWith(".skel"));
  const hasAtlas = names.some((n) => n.endsWith(".atlas"));
  const hasTexture = names.some((n) => /\.(png|webp|jpe?g)$/.test(n));
  if (!hasData) return "Spine bundle needs one .json or .skel file.";
  if (!hasAtlas) return "Spine bundle needs one .atlas file.";
  if (!hasTexture) return "Spine bundle needs at least one texture image.";
  return null;
}

export function spinePlayerHtml(spine: SpineBundleMeta): string {
  const config = JSON.stringify({
    jsonUrl: spine.jsonUrl,
    atlasUrl: spine.atlasUrl,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/iife/spine-player.css" />
  <style>
    html, body, #player { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #060a14; color-scheme: dark; }
    * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: #334155 #060a14; }
    *::-webkit-scrollbar { width: 10px; height: 10px; }
    *::-webkit-scrollbar-track { background: #060a14; }
    *::-webkit-scrollbar-thumb { background: #334155; border-radius: 999px; border: 2px solid #060a14; }
    .spine-player { width: 100% !important; height: 100% !important; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script src="https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/iife/spine-player.js"></script>
  <script>
    const config = ${config};
    function start() {
      if (!window.spine || !window.spine.SpinePlayer) {
        document.body.innerHTML = '<div style="font:14px system-ui;color:#94a3b8;padding:24px">Could not load Spine Player.</div>';
        return;
      }
      new spine.SpinePlayer("player", {
        jsonUrl: config.jsonUrl,
        atlasUrl: config.atlasUrl,
        showControls: true,
        alpha: true,
        backgroundColor: "#060a14",
        viewport: { debugRender: false },
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  </script>
</body>
</html>`;
}
