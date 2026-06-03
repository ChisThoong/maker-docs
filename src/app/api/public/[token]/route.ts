import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public anonymous links are disabled — all docs require login. */
export async function GET() {
  return NextResponse.json(
    { error: "public_links_disabled" },
    { status: 410 }
  );
}
