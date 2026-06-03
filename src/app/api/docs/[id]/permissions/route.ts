import { NextRequest, NextResponse } from "next/server";
import { listDocs, getDoc, setDocVisibility } from "@/lib/docs";
import { getAclEntries, getAclMap, setAclEntries, type ACEntry } from "@/lib/acl";
import { getAccessContext, buildResolver } from "@/lib/permissions";
import { listJobPositions } from "@/lib/members";
import { buildDocPath } from "@/lib/doc-paths";
import { getMemberName, notifyShareGrants } from "@/lib/notifications";
import type { DocVisibility } from "@/lib/types";

export const dynamic = "force-dynamic";

async function ancestorChain(id: string) {
  const metas = await listDocs();
  const byId = new Map(metas.map((m) => [m.id, m]));
  const chain: { id: string; title: string }[] = [];
  let cur = byId.get(id)?.parentId ?? null;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    const m = byId.get(cur);
    if (!m) break;
    chain.push({ id: m.id, title: m.title });
    cur = m.parentId;
  }
  return chain;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const resolver = await buildResolver(ctx);
  if (!resolver.capsOf(id).canManagePerms) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const doc = await getDoc(id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const direct = await getAclEntries(id);
  const chain = await ancestorChain(id);
  const aclMap = await getAclMap(chain.map((c) => c.id));
  const inherited = chain
    .map((c) => ({ docId: c.id, title: c.title, entries: aclMap.get(c.id) ?? [] }))
    .filter((c) => c.entries.length > 0);
  const availableJobPositions = await listJobPositions();
  const metas = await listDocs();
  const docPath = buildDocPath(id, metas);

  return NextResponse.json({
    docId: id,
    visibility: doc.visibility ?? "inherit",
    owner: doc.createdBy ?? null,
    docPath,
    direct,
    inherited,
    availableJobPositions,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const resolver = await buildResolver(ctx);
  if (!resolver.capsOf(id).canManagePerms) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    entries?: ACEntry[];
    visibility?: DocVisibility;
  };

  if (body.visibility === "inherit" || body.visibility === "restricted") {
    await setDocVisibility(id, body.visibility);
  }

  let direct: ACEntry[] | undefined;
  if (Array.isArray(body.entries)) {
    const previous = await getAclEntries(id);
    const doc = await getDoc(id);
    const metas = await listDocs();
    const docPath = buildDocPath(id, metas);
    const actorName = await getMemberName(ctx.email);

    direct = await setAclEntries(id, body.entries, ctx.email);

    if (doc) {
      await notifyShareGrants({
        docId: id,
        docTitle: doc.title,
        docPath,
        actorEmail: ctx.email,
        actorName,
        previous,
        next: direct,
      });
    }
  }

  return NextResponse.json({ ok: true, direct });
}
