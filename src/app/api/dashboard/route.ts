import { NextResponse } from "next/server";
import { listDocs } from "@/lib/docs";
import { getAccessContext, buildResolver } from "@/lib/permissions";
import { listActivity, activityVerb } from "@/lib/activity";
import { getMemberName } from "@/lib/notifications";
import { getUserPrefs, filterVisibleIds } from "@/lib/user-prefs";
import { buildDocPath } from "@/lib/doc-paths";
import type { DocMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

function computeHealth(docs: DocMeta[]) {
  const total = docs.length || 1;
  const byStatus = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    design: Math.round(
      ((byStatus.locked ?? 0) +
        (byStatus.shipped ?? 0) +
        (byStatus.review ?? 0)) /
        total *
        100
    ),
    impl: Math.round(
      (((byStatus.shipped ?? 0) + (byStatus.in_dev ?? 0) * 0.5) / total) * 100
    ),
    qa: Math.round(((byStatus.shipped ?? 0) / total) * 100),
  };
}

function computeStats(docs: DocMeta[]) {
  const byStatus = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const newThisMonth = docs.filter(
    (d) => new Date(d.createdAt).getTime() > cutoff
  ).length;

  return {
    total: docs.length,
    locked: byStatus.locked ?? 0,
    in_dev: byStatus.in_dev ?? 0,
    concept: byStatus.concept ?? 0,
    newThisMonth,
  };
}

async function authorName(email: string | null | undefined): Promise<string> {
  if (!email) return "Member";
  return getMemberName(email);
}

export async function GET() {
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const all = await listDocs();
  const resolver = await buildResolver(ctx);
  const visible = resolver.filterMetas(all);
  const visibleSet = new Set(visible.map((d) => d.id));
  const isAdmin = ctx.workspaceRole === "admin";

  const prefs = await getUserPrefs(ctx.email);
  const favoriteIds = filterVisibleIds(prefs.favorites, visibleSet);
  const recentViewIds = filterVisibleIds(prefs.recents, visibleSet);

  const byId = new Map(visible.map((d) => [d.id, d]));
  const favorites = favoriteIds
    .map((id) => byId.get(id))
    .filter(Boolean) as DocMeta[];
  const recentViews = recentViewIds
    .map((id) => byId.get(id))
    .filter(Boolean) as DocMeta[];

  const recentUpdated = [...visible]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 6);

  const activityRows = await listActivity(
    isAdmin ? null : [...visibleSet],
    20
  );

  const activity = await Promise.all(
    activityRows.map(async (a) => ({
      id: a.id,
      docId: a.docId,
      docTitle: a.docTitle,
      docPath: buildDocPath(a.docId, all),
      actorEmail: a.actorEmail,
      actorName: await authorName(a.actorEmail),
      verb: activityVerb(a.action, a.status),
      createdAt: a.createdAt,
    }))
  );

  const recentWithAuthors = await Promise.all(
    recentUpdated.map(async (d) => ({
      ...d,
      authorName: await authorName(d.createdBy),
    }))
  );

  return NextResponse.json({
    workspaceRole: ctx.workspaceRole,
    stats: computeStats(visible),
    health: computeHealth(visible),
    recent: recentWithAuthors,
    favorites,
    recentViews,
    activity,
  });
}
