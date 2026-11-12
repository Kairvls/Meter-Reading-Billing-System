import { NextResponse } from "next/server";
import { getAdminUsername } from "@/lib/admin-credentials";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const username = await getAdminUsername();
    return NextResponse.json({ ok: true, user: { username } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
