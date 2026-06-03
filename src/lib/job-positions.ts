/** Pretty label: gameTester → GameTester, marketing_social → MarketingSocial */
export function formatJobPositionLabel(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (s.toLowerCase() === "everyone") return "Everyone";

  const words = s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/** Legacy slug (pre camelCase split) — kept for ACL entries already saved. */
export function jobPositionSlugLegacy(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized ? `job:${normalized}` : "job:unknown";
}

/** Stable ACL subject id for a job position (e.g. "gameTester" → "job:game-tester"). */
export function jobPositionSlug(label: string): string {
  const normalized = label
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized ? `job:${normalized}` : "job:unknown";
}

/** Human-readable label from a stored slug (fallback when label missing). */
export function jobPositionLabelFromSlug(slug: string): string {
  if (slug === "everyone") return "Everyone";
  if (!slug.startsWith("job:")) return formatJobPositionLabel(slug);
  const words = slug.slice(4).split("-").filter(Boolean);
  return formatJobPositionLabel(words.join(" "));
}

export interface JobPositionOption {
  id: string;
  label: string;
}

/** Resolve display label for an ACL role entry. */
export function aclRoleLabel(
  subjectId: string,
  label?: string | null,
  options?: JobPositionOption[]
): string {
  if (label) return formatJobPositionLabel(label);
  const hit = options?.find((o) => o.id === subjectId);
  if (hit) return hit.label;
  return jobPositionLabelFromSlug(subjectId);
}
