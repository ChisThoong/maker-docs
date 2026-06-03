import { NextRequest, NextResponse } from "next/server";
import { reorderDocs } from "@/lib/docs";
import { getAccessContext, buildResolver } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];

    const resolver = await buildResolver(ctx);
    // Must be able to edit each moved doc and create under each new parent.
    for (const u of updates) {
      if (!resolver.capsOf(u.id).canEdit || !resolver.canCreateUnder(u.parentId ?? null)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    await reorderDocs(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
