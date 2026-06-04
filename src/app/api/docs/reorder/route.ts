import { NextRequest, NextResponse } from "next/server";
import { listDocs, reorderDocs } from "@/lib/docs";
import { getAccessContext, buildResolver } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];

    const resolver = await buildResolver(ctx);
    const docs = await listDocs();
    const parentById = new Map(docs.map((d) => [d.id, d.parentId]));
    for (const u of updates) {
      parentById.set(u.id, u.parentId ?? null);
    }

    function createsCycle(id: string, parentId: string | null) {
      let cur = parentId;
      const seen = new Set<string>();
      while (cur) {
        if (cur === id) return true;
        if (seen.has(cur)) return true;
        seen.add(cur);
        cur = parentById.get(cur) ?? null;
      }
      return false;
    }

    // Must be able to edit each moved doc and create under each new parent.
    for (const u of updates) {
      if (createsCycle(u.id, u.parentId ?? null)) {
        return NextResponse.json({ error: "invalid tree move" }, { status: 400 });
      }
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
