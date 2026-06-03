import { NextRequest, NextResponse } from "next/server";
import { searchMembers, listMembers } from "@/lib/members";
import { getProfile, setWorkspaceRole } from "@/lib/profiles";
import { getAccessContext } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET /api/members            -> autocomplete search (any logged-in user)
// GET /api/members?all=1      -> full member directory (any logged-in user)
export async function GET(req: NextRequest) {
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const all = searchParams.get("all");

  if (all) {
    const members = await listMembers();
    return NextResponse.json({ members });
  }

  const q = searchParams.get("q") ?? "";
  const members = await searchMembers(q);
  return NextResponse.json({ members });
}

// PUT /api/members  { email, role: "admin"|"editor"|"viewer"|null }  (admin)
export async function PUT(req: NextRequest) {
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (ctx.workspaceRole !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    role?: string | null;
  };
  if (!body.email) {
    return NextResponse.json({ error: "missing_email" }, { status: 400 });
  }
  const role =
    body.role === "admin" || body.role === "editor" || body.role === "viewer"
      ? body.role
      : null;

  // Preserve any existing profile fields; only touch workspaceRole.
  await getProfile(body.email).catch(() => null);
  await setWorkspaceRole(body.email, role);

  return NextResponse.json({ ok: true });
}
