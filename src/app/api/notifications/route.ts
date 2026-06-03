import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/permissions";
import {
  countUnread,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [notifications, unread] = await Promise.all([
    listNotifications(ctx.email),
    countUnread(ctx.email),
  ]);

  return NextResponse.json({ notifications, unread });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAccessContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    all?: boolean;
  };

  if (body.all) {
    await markAllNotificationsRead(ctx.email);
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    const ok = await markNotificationRead(body.id, ctx.email);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
