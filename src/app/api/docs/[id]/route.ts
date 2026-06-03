import { NextRequest, NextResponse } from "next/server";
import { getDoc, updateDoc, deleteDoc, listDocs } from "@/lib/docs";
import { deleteAclForDocs } from "@/lib/acl";
import { getAccessContext, buildResolver } from "@/lib/permissions";
import { buildDocPath } from "@/lib/doc-paths";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await getAccessContext();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const resolver = await buildResolver(ctx);
    const caps = resolver.capsOf(id);
    if (!caps.canView) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const doc = await getDoc(id);
    if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const metas = await listDocs();
    const path = buildDocPath(id, metas);
    return NextResponse.json({ doc, access: caps, path });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await getAccessContext();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const resolver = await buildResolver(ctx);
    if (!resolver.capsOf(id).canEdit) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    // visibility is managed via the permissions endpoint, never here.
    delete body.visibility;
    delete body.createdBy;
    const before = await getDoc(id);
    const doc = await updateDoc(id, body);
    if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const statusChanged =
      before && body.status != null && body.status !== before.status;
    await logActivity({
      docId: doc.id,
      docTitle: doc.title,
      actorEmail: ctx.email,
      action: statusChanged ? "status_changed" : "updated",
      status: doc.status,
      previousStatus: before?.status ?? null,
    });

    const metas = await listDocs();
    const path = buildDocPath(id, metas);
    return NextResponse.json({ doc, path });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ctx = await getAccessContext();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const resolver = await buildResolver(ctx);
    if (!resolver.capsOf(id).canDelete) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const deleted = await deleteDoc(id);
    await deleteAclForDocs(deleted);
    return NextResponse.json({ deleted });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
