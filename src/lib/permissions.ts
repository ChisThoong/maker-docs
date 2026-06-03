import { auth } from "@/auth";
import { getDb, COL } from "./mongodb";
import { getProfile } from "./profiles";
import { getAclMap, type AccessLevel, type ACEntry } from "./acl";
import { jobPositionSlug, jobPositionSlugLegacy } from "./job-positions";
import type { DocMeta, DocVisibility } from "./types";

export type WorkspaceRole = "viewer" | "editor" | "admin";

export interface Capabilities {
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateChild: boolean;
  canManagePerms: boolean;
}

export interface AccessContext {
  email: string;
  userId: string | null;
  teamRole: string | null;
  workspaceRole: WorkspaceRole;
  /** Lowercased role identifiers used to match ACL "role" entries. */
  roles: string[];
}

/** Team roles that map to a maker-docs workspace admin by default. */
const ADMIN_TEAM_ROLES = new Set([
  "admin",
  "owner",
  "superadmin",
  "lead",
  "leader",
  "manager",
  "director",
  "ceo",
  "cto",
]);

const RANK: Record<AccessLevel, number> = {
  viewer: 1,
  commenter: 1, // legacy — treated as viewer
  editor: 2,
  admin: 3,
};

function baseRank(role: WorkspaceRole): number {
  return role === "admin" ? 3 : role === "editor" ? 2 : 1;
}

export function capsFromRank(rank: number): Capabilities {
  return {
    canView: rank >= 1,
    canComment: false,
    canEdit: rank >= 2,
    canDelete: rank >= 2,
    canCreateChild: rank >= 2,
    canManagePerms: rank >= 3,
  };
}

export function resolveWorkspaceRole(
  teamRole: string | null,
  isMember: boolean,
  override?: string | null
): WorkspaceRole {
  if (override === "admin" || override === "editor" || override === "viewer") {
    return override;
  }
  if (teamRole && ADMIN_TEAM_ROLES.has(teamRole.toLowerCase())) return "admin";
  return isMember ? "editor" : "viewer";
}

/** Build the access context for the current session (null if not logged in). */
export async function getAccessContext(): Promise<AccessContext | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const teamRole = session.user.role ?? null;
  const jobPosition = session.user.jobPosition ?? null;
  const isMember = !!(
    session.user.role ||
    session.user.memberId ||
    session.user.jobPosition
  );
  const override = await getProfile(email)
    .then((p) => (p as { workspaceRole?: string } | null)?.workspaceRole ?? null)
    .catch(() => null);

  const workspaceRole = resolveWorkspaceRole(teamRole, isMember, override);

  const roles = new Set<string>(["everyone", workspaceRole]);
  if (teamRole) roles.add(teamRole.toLowerCase());
  if (jobPosition) {
    roles.add(jobPositionSlug(jobPosition));
    const legacy = jobPositionSlugLegacy(jobPosition);
    if (legacy !== jobPositionSlug(jobPosition)) roles.add(legacy);
  }

  return {
    email: email.toLowerCase(),
    userId: session.user.id ?? null,
    teamRole,
    workspaceRole,
    roles: [...roles],
  };
}

interface StructNode {
  parentId: string | null;
  createdBy: string | null;
  visibility: DocVisibility;
}

export interface AccessResolver {
  ctx: AccessContext;
  rankOf: (docId: string) => number;
  capsOf: (docId: string) => Capabilities;
  canCreateUnder: (parentId: string | null) => boolean;
  filterMetas: (metas: DocMeta[]) => DocMeta[];
}

/**
 * Loads the document structure + all ACL entries once, then resolves the
 * effective access for any document via RBAC + inherited ACL + restriction.
 */
export async function buildResolver(
  ctx: AccessContext
): Promise<AccessResolver> {
  const db = await getDb();
  const rows = await db
    .collection(COL.documents)
    .find({}, { projection: { _id: 1, parentId: 1, createdBy: 1, visibility: 1 } })
    .toArray();

  const struct = new Map<string, StructNode>();
  for (const r of rows) {
    const createdBy = (r.createdBy as string | null) ?? null;
    struct.set(String(r._id), {
      parentId: (r.parentId as string | null) ?? null,
      createdBy: createdBy ? createdBy.toLowerCase() : null,
      visibility: (r.visibility as DocVisibility) ?? "inherit",
    });
  }

  const aclMap = await getAclMap();

  const matches = (e: ACEntry): boolean =>
    e.subjectType === "user"
      ? e.subjectId.toLowerCase() === ctx.email
      : ctx.roles.includes(e.subjectId.toLowerCase());

  function rankOf(docId: string): number {
    if (!struct.has(docId)) return 0;

    const chain: string[] = [];
    let restricted = false;
    let owner = false;
    let cur: string | null = docId;
    const guard = new Set<string>();
    while (cur && !guard.has(cur)) {
      guard.add(cur);
      const n = struct.get(cur);
      if (!n) break;
      chain.push(cur);
      if (n.visibility === "restricted") restricted = true;
      if (n.createdBy && n.createdBy === ctx.email) owner = true;
      cur = n.parentId;
    }

    let rank = restricted
      ? ctx.workspaceRole === "admin"
        ? 3
        : 0
      : baseRank(ctx.workspaceRole);
    if (owner) rank = 3;

    for (const id of chain) {
      for (const e of aclMap.get(id) ?? []) {
        if (matches(e)) rank = Math.max(rank, RANK[e.level]);
      }
    }
    return rank;
  }

  function capsOf(docId: string): Capabilities {
    return capsFromRank(rankOf(docId));
  }

  function canCreateUnder(parentId: string | null): boolean {
    if (parentId === null) return ctx.workspaceRole !== "viewer";
    return capsOf(parentId).canCreateChild;
  }

  function filterMetas(metas: DocMeta[]): DocMeta[] {
    return metas.filter((m) => rankOf(m.id) >= 1);
  }

  return { ctx, rankOf, capsOf, canCreateUnder, filterMetas };
}
