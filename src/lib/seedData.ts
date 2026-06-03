import type { ContentMode, DocStatus, DocType } from "./types";

export interface SeedRecord {
  _id: string;
  title: string;
  subtitle?: string;
  type: DocType;
  parentId: string | null;
  order: number;
  status: DocStatus;
  icon: string;
  tags: string[];
  content: string;
  contentMode: ContentMode;
}

function d(o: Partial<SeedRecord> & { _id: string; title: string }): SeedRecord {
  return {
    subtitle: "",
    type: "doc",
    parentId: null,
    order: 0,
    status: "concept",
    icon: "",
    tags: [],
    content: "",
    contentMode: "html",
    ...o,
  };
}

const sproutContent = `
<p><strong>ID #15 · Grass · A-Rank · Long Range · Summoner</strong></p>
<blockquote>DESIGN LOCKED — READY FOR IMPLEMENTATION</blockquote>

<h2>Design Intent</h2>
<p>Sprout is the only Summoner on the roster — a hero that shifts the player from "shooting enemies" to "managing a small squad." Seedlings are placed on the battlefield as obstacles, attack nearby enemies, and absorb damage. The death-and-respawn cycle creates a unique rhythm: spawn, sacrifice, heal, respawn.</p>

<h2>Core Behavior</h2>
<ul>
  <li>Sprout stays on the Ship and attacks with ranged projectiles between Bloom Burst casts.</li>
  <li>When casting the skill, launches a seed pod to the target area, creating allied Seedling units.</li>
  <li>Seedlings are independent entities with HP based on % Ship Max HP, automatically attacking enemies in range.</li>
  <li>When a Seedling dies, Root Network triggers — restoring Ship HP and buffing remaining Seedlings.</li>
</ul>

<h2>Active: Bloom Burst</h2>
<table>
  <thead><tr><th>Level</th><th>Mana</th><th>CD</th><th>Spawns</th><th>Seedling HP</th><th>Seedling ATK</th><th>Max Active</th></tr></thead>
  <tbody>
    <tr><td>L1</td><td>25</td><td>10s</td><td>1</td><td>5%</td><td>15%</td><td>3</td></tr>
    <tr><td>L2</td><td>25</td><td>9s</td><td>2</td><td>7%</td><td>20%</td><td>4</td></tr>
    <tr><td>L3</td><td>25</td><td>8s</td><td>2</td><td>9%</td><td>25%</td><td>5</td></tr>
  </tbody>
</table>

<h2>Balance</h2>
<table>
  <thead><tr><th>Value</th><th>Status</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Attack range (~180px)</td><td>Finalized</td><td>~3 unit lengths at 1080p scale</td></tr>
    <tr><td>Seed pod travel time</td><td>[TBD]</td><td>Suggested ~0.5s</td></tr>
    <tr><td>Root Network heal (2–4%)</td><td>Suggested</td><td>Supplemental, does not replace dedicated healing</td></tr>
  </tbody>
</table>

<h2>Team Synergies</h2>
<ul>
  <li><strong>Grim</strong> — Ship HP buff + Vine Barrier</li>
  <li><strong>Flora</strong> — Mana engine for frequent Bloom Burst casts</li>
  <li><strong>Verdant</strong> — Hunter Mark for focused boss damage</li>
</ul>
`;

export const SEED_DOCS: SeedRecord[] = [
  d({ _id: "woe-root", title: "Wings of Everland", type: "folder", parentId: null, order: 0, status: "in_dev", icon: "lucide:gamepad-2", subtitle: "Maker Studios — game documentation" }),
  d({ _id: "heroes", title: "Heroes", type: "folder", parentId: "woe-root", order: 0, status: "in_dev", icon: "lucide:swords" }),
  d({ _id: "mechanics", title: "Mechanics", type: "folder", parentId: "woe-root", order: 1, status: "in_dev", icon: "lucide:cog" }),
  d({ _id: "features", title: "Features", type: "folder", parentId: "woe-root", order: 2, status: "concept", icon: "lucide:target" }),
  d({ _id: "sprout", title: "Sprout", type: "hero", parentId: "heroes", order: 0, status: "locked", icon: "lucide:sprout", subtitle: "Grass · A-Rank · Long Range Summoner", tags: ["grass", "summoner", "a-rank"], content: sproutContent }),
  d({ _id: "bloom-burst", title: "Bloom Burst", type: "skill", parentId: "sprout", order: 0, status: "locked", icon: "lucide:zap", tags: ["active"], content: "<h2>Description</h2><p>Creates allied Seedling units at the target location. Cast range covers the entire battlefield.</p>" }),
  d({ _id: "root-network", title: "Root Network", type: "skill", parentId: "sprout", order: 1, status: "locked", icon: "lucide:leaf", tags: ["passive"], content: "<h2>Description</h2><p>Triggers when a Seedling dies — restores Ship HP and increases ATK SPD for remaining Seedlings.</p>" }),
  d({ _id: "fertile-ground", title: "Fertile Ground", type: "skill", parentId: "sprout", order: 2, status: "review", icon: "lucide:globe", tags: ["passive", "synergy"], content: "<h2>Description</h2><p>Seedlings are tougher with each Grass hero on the Ship (+8% / +12% / +16% Max HP).</p>" }),
  d({ _id: "grim", title: "Grim", type: "hero", parentId: "heroes", order: 1, status: "in_dev", icon: "lucide:shield", subtitle: "Grass · Tank · Vine Barrier", tags: ["grass", "tank"], content: "<h2>Overview</h2><p>Grass tank — buffs Ship HP and creates Vine Barrier.</p>" }),
  d({ _id: "aggro", title: "Aggro / Path Collision", type: "mechanic", parentId: "mechanics", order: 0, status: "locked", icon: "lucide:target", content: "<h2>Definition</h2><p>Enemies only attack Seedlings when they are directly on the path. No forced taunt mechanic.</p>" }),
  d({ _id: "summon-cap", title: "Summon Cap", type: "mechanic", parentId: "mechanics", order: 1, status: "locked", icon: "lucide:infinity", content: "<h2>Definition</h2><p>Spawning beyond max active removes the oldest Seedling (silent removal — does NOT trigger Root Network).</p>" }),
];
