import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProfile, upsertProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(email).catch(() => null);
  const u = session.user;
  return NextResponse.json({
    email,
    name: profile?.displayName || u.name || email,
    image: profile?.avatarUrl || u.image || null,
    googleImage: u.image || null,
    avatarUrl: profile?.avatarUrl || null,
    displayName: profile?.displayName || null,
    bio: profile?.bio || null,
    role: u.role ?? null,
    jobPosition: u.jobPosition ?? null,
    permissions: u.permissions ?? [],
    isActive: u.isActive ?? null,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    avatarUrl?: string | null;
    displayName?: string | null;
    bio?: string | null;
  };

  const patch: Record<string, unknown> = {};
  if ("avatarUrl" in body) patch.avatarUrl = body.avatarUrl || null;
  if ("displayName" in body) {
    const v = (body.displayName ?? "").toString().trim();
    patch.displayName = v || null;
  }
  if ("bio" in body) {
    const v = (body.bio ?? "").toString().trim();
    patch.bio = v || null;
  }

  const profile = await upsertProfile(email, patch);
  return NextResponse.json({ ok: true, profile });
}
