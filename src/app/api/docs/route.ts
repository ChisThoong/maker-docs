import { NextRequest, NextResponse } from "next/server";
import { listDocs, createDoc } from "@/lib/docs";
import { getAccessContext, buildResolver, invalidateAccessResolverCache } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getAccessContext();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const [all, resolver] = await Promise.all([listDocs(), buildResolver(ctx)]);
    const docs = resolver.filterMetas(all);

    return NextResponse.json({
      docs,
      workspaceRole: ctx.workspaceRole,
      canCreate: ctx.workspaceRole !== "viewer",
    });
  } catch (err) {
    console.error("GET /api/docs", err);
    return NextResponse.json(
      { error: "db_unavailable", message: String(err) },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const parentId = body?.parentId ?? null;

    const resolver = await buildResolver(ctx);
    if (!resolver.canCreateUnder(parentId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const doc = await createDoc({ ...body, createdBy: ctx.email });
    await logActivity({
      docId: doc.id,
      docTitle: doc.title,
      actorEmail: ctx.email,
      action: "created",
      status: doc.status,
    });
    invalidateAccessResolverCache();
    return NextResponse.json({ doc }, { status: 201 });
  } catch (err) {
    console.error("POST /api/docs", err);
    return NextResponse.json(
      { error: "create_failed", message: String(err) },
      { status: 500 }
    );
  }
}
