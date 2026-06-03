import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/permissions";
import { recordDocVisit, toggleDocFavorite } from "@/lib/user-prefs";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { getUserPrefs } = await import("@/lib/user-prefs");
  const prefs = await getUserPrefs(ctx.email);
  return NextResponse.json(prefs);
}

export async function POST(req: NextRequest) {
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    visit?: string;
    toggleFavorite?: string;
  };

  if (body.visit) {
    const prefs = await recordDocVisit(ctx.email, body.visit);
    return NextResponse.json(prefs);
  }

  if (body.toggleFavorite) {
    const prefs = await toggleDocFavorite(ctx.email, body.toggleFavorite);
    return NextResponse.json(prefs);
  }

  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
