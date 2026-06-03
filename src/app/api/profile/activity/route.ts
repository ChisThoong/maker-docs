import { NextResponse } from "next/server";
import { listDocs } from "@/lib/docs";
import { getAccessContext, buildResolver } from "@/lib/permissions";
import { listActivity, activityVerb } from "@/lib/activity";
import { buildDocPath } from "@/lib/doc-paths";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const all = await listDocs();
  const resolver = await buildResolver(ctx);
  const visible = resolver.filterMetas(all);
  const visibleSet = new Set(visible.map((d) => d.id));

  const rows = await listActivity(
    ctx.workspaceRole === "admin" ? null : [...visibleSet],
    20,
    { actorEmail: ctx.email }
  );

  const activity = rows.map((a) => ({
    id: a.id,
    docId: a.docId,
    docTitle: a.docTitle,
    docPath: buildDocPath(a.docId, all),
    verb: activityVerb(a.action, a.status),
    createdAt: a.createdAt,
  }));

  return NextResponse.json({ activity });
}
