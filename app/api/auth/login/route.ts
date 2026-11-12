import { NextResponse } from "next/server";
import { verifyAdminLogin } from "@/lib/admin-credentials";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid username or password." },
        { status: 400 }
      );
    }

    const verified = await verifyAdminLogin(
      parsed.data.username,
      parsed.data.password
    );
    if (!verified.ok) {
      return NextResponse.json(
        { ok: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({ username: verified.username });
    const response = NextResponse.json({
      ok: true,
      user: { username: verified.username },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
