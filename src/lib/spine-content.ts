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

export function spinePlayerHtml(
  spine: SpineBundleMeta,
  theme: "light" | "dark" = "light"
): string {
  const isDark = theme === "dark";
  const bg = isDark ? "#060a14" : "#f8fafc";
  const text = isDark ? "#e2e8f0" : "#0f172a";
  const muted = isDark ? "#94a3b8" : "#64748b";
  const panel = isDark ? "rgba(15, 23, 42, 0.82)" : "rgba(255, 255, 255, 0.88)";
  const control = isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(241, 245, 249, 0.95)";
  const controlHover = isDark ? "rgba(51, 65, 85, 0.95)" : "rgba(226, 232, 240, 0.98)";
  const border = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(15, 23, 42, 0.14)";
  const shadow = isDark ? "rgba(0, 0, 0, 0.35)" : "rgba(15, 23, 42, 0.16)";
  const config = JSON.stringify({
    jsonUrl: spine.jsonUrl,
    atlasUrl: spine.atlasUrl,
    backgroundColor: bg,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/iife/spine-player.css" />
  <style>
    html, body, #player { margin: 0; width: 100%; height: 100%; overflow: hidden; background: ${bg}; color-scheme: ${theme}; }
    * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: ${isDark ? "#334155 #060a14" : "#cbd5e1 #f8fafc"}; }
    *::-webkit-scrollbar { width: 10px; height: 10px; }
    *::-webkit-scrollbar-track { background: ${bg}; }
    *::-webkit-scrollbar-thumb { background: ${isDark ? "#334155" : "#cbd5e1"}; border-radius: 999px; border: 2px solid ${bg}; }
    .spine-player { width: 100% !important; height: 100% !important; }
    .custom-controls {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 20;
      display: flex;
      max-width: calc(100vw - 24px);
      align-items: center;
      gap: 8px;
      border: 1px solid ${border};
      border-radius: 999px;
      background: ${panel};
      padding: 8px;
      color: ${text};
      font: 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 50px ${shadow};
    }
    .custom-controls button,
    .custom-controls select {
      height: 30px;
      border: 1px solid ${border};
      border-radius: 999px;
      background: ${control};
      color: ${text};
      font: inherit;
    }
    .custom-controls button {
      min-width: 34px;
      cursor: pointer;
      padding: 0 10px;
    }
    .custom-controls button:hover,
    .custom-controls select:hover {
      border-color: rgba(56, 189, 248, 0.55);
      background: ${controlHover};
    }
    .custom-controls select {
      min-width: 160px;
      max-width: 220px;
      padding: 0 28px 0 10px;
    }
    .custom-controls .speed {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
      color: ${muted};
      white-space: nowrap;
    }
    .custom-controls input {
      width: 80px;
      accent-color: #38bdf8;
    }
    @media (max-width: 640px) {
      .custom-controls {
        top: auto;
        right: auto;
        left: 12px;
        bottom: 78px;
        width: calc(100vw - 24px);
        overflow-x: auto;
        justify-content: flex-start;
        border-radius: 18px;
      }
      .custom-controls select { min-width: 160px; }
    }
  </style>
</head>
<body>
  <div id="player"></div>
  <div class="custom-controls" id="controls" hidden>
    <button type="button" id="prev" title="Previous animation">‹</button>
    <button type="button" id="play" title="Play/Pause">Pause</button>
    <button type="button" id="next" title="Next animation">›</button>
    <select id="animation" title="Animation"></select>
    <button type="button" id="restart" title="Restart animation">Restart</button>
    <label class="speed" title="Playback speed">
      <span id="speed-label">1x</span>
      <input id="speed" type="range" min="0.25" max="2" step="0.25" value="1" />
    </label>
  </div>
  <script src="https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/iife/spine-player.js"></script>
  <script>
    const config = ${config};
    function start() {
      if (!window.spine || !window.spine.SpinePlayer) {
        document.body.innerHTML = '<div style="font:14px system-ui;color:${muted};padding:24px">Could not load Spine Player.</div>';
        return;
      }
      let currentAnimation = "";
      let isPlaying = true;
      function applyPlayback(player) {
        if (player?.animationState) player.animationState.timeScale = isPlaying ? Number(document.getElementById("speed").value) : 0;
      }
      function setAnimation(player, name) {
        if (!name || !player?.animationState) return;
        currentAnimation = name;
        player.animationState.setAnimation(0, name, true);
        applyPlayback(player);
        const select = document.getElementById("animation");
        if (select) select.value = name;
      }
      function animationName(animation) {
        return typeof animation === "string" ? animation : animation?.name || "";
      }
      function setupControls(player, animations) {
        const controls = document.getElementById("controls");
        const play = document.getElementById("play");
        const prev = document.getElementById("prev");
        const next = document.getElementById("next");
        const restart = document.getElementById("restart");
        const select = document.getElementById("animation");
        const speed = document.getElementById("speed");
        const speedLabel = document.getElementById("speed-label");
        if (!controls || !play || !prev || !next || !restart || !select || !speed || !speedLabel) return;

        select.innerHTML = "";
        animations.forEach((animation) => {
          const name = animationName(animation);
          if (!name) return;
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          select.appendChild(option);
        });

        const animationIndex = () =>
          Math.max(0, animations.findIndex((a) => animationName(a) === currentAnimation));
        play.onclick = () => {
          isPlaying = !isPlaying;
          play.textContent = isPlaying ? "Pause" : "Play";
          applyPlayback(player);
        };
        prev.onclick = () => {
          const i = animationIndex();
          setAnimation(player, animationName(animations[(i - 1 + animations.length) % animations.length]));
        };
        next.onclick = () => {
          const i = animationIndex();
          setAnimation(player, animationName(animations[(i + 1) % animations.length]));
        };
        restart.onclick = () => setAnimation(player, currentAnimation);
        select.onchange = () => setAnimation(player, select.value);
        speed.oninput = () => {
          speedLabel.textContent = speed.value + "x";
          applyPlayback(player);
        };
        controls.hidden = animations.length === 0;
      }
      function playFirstAnimation(player) {
        const animations = player?.skeleton?.data?.animations || [];
        const firstAnimation = animationName(animations[0]);
        if (!firstAnimation || !player?.animationState) return;
        setupControls(player, animations);
        setAnimation(player, firstAnimation);
      }
      new spine.SpinePlayer("player", {
        jsonUrl: config.jsonUrl,
        atlasUrl: config.atlasUrl,
        showControls: true,
        alpha: true,
        backgroundColor: config.backgroundColor,
        viewport: { debugRender: false },
        success: playFirstAnimation,
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  </script>
</body>
</html>`;
}
