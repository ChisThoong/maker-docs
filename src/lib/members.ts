import { getDb } from "./mongodb";
import {
  jobPositionSlug,
  formatJobPositionLabel,
  type JobPositionOption,
} from "./job-positions";
import { getPersonDisplayMap, type PersonDisplay } from "./profiles";

export interface MemberLite {
  email: string;
  name: string;
  role: string | null;
  jobPosition?: string | null;
  image?: string | null;
}

interface MemberDoc {
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role?: string;
  jobPosition?: string;
  isActive?: boolean;
}

function fullName(m: MemberDoc): string {
  const n = [m.firstName, m.middleName, m.lastName].filter(Boolean).join(" ").trim();
  return n || m.email;
}

function toLite(m: MemberDoc, display?: PersonDisplay): MemberLite {
  return {
    email: m.email,
    name: display?.displayName || fullName(m),
    role: m.role ?? null,
    jobPosition: m.jobPosition ?? null,
    image: display?.image ?? null,
  };
}

async function enrichMembers(rows: MemberDoc[]): Promise<MemberLite[]> {
  const displayMap = await getPersonDisplayMap(rows.map((r) => r.email));
  return rows.map((r) => toLite(r, displayMap.get(r.email.toLowerCase())));
}

/** Search shared `members` (read-only) by name or email. */
export async function searchMembers(
  q: string,
  limit = 10
): Promise<MemberLite[]> {
  const db = await getDb();
  const term = q.trim();
  // Only active accounts (treat missing isActive as active).
  const active = { isActive: { $ne: false } };
  const filter = term
    ? {
        ...active,
        $or: [
          { email: { $regex: term, $options: "i" } },
          { firstName: { $regex: term, $options: "i" } },
          { lastName: { $regex: term, $options: "i" } },
          { middleName: { $regex: term, $options: "i" } },
        ],
      }
    : active;
  const rows = await db
    .collection<MemberDoc>("members")
    .find(filter, {
      projection: {
        email: 1,
        firstName: 1,
        middleName: 1,
        lastName: 1,
        role: 1,
        jobPosition: 1,
      },
    })
    .limit(limit)
    .toArray();
  return enrichMembers(rows);
}

export async function listMembers(): Promise<MemberLite[]> {
  const db = await getDb();
  const rows = await db
    .collection<MemberDoc>("members")
    .find(
      { isActive: { $ne: false } },
      {
        projection: {
          email: 1,
          firstName: 1,
          middleName: 1,
          lastName: 1,
          role: 1,
          jobPosition: 1,
        },
      }
    )
    .sort({ firstName: 1 })
    .limit(500)
    .toArray();
  return enrichMembers(rows);
}

/** Distinct job positions from active members, for ACL grants. */
export async function listJobPositions(): Promise<JobPositionOption[]> {
  const db = await getDb();
  const raw = await db
    .collection<MemberDoc>("members")
    .distinct("jobPosition", { isActive: { $ne: false } });

  const positions = (raw as (string | null | undefined)[])
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "vi"));

  const seen = new Set<string>();
  const options: JobPositionOption[] = [
    { id: "everyone", label: "Everyone" },
  ];

  for (const label of positions) {
    const id = jobPositionSlug(label);
    if (seen.has(id)) continue;
    seen.add(id);
    options.push({ id, label: formatJobPositionLabel(label) });
  }

  return options;
}
