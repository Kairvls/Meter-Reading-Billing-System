import { NextResponse } from "next/server";
import { z } from "zod";
import { updateAdminCredentials } from "@/lib/admin-credentials";
import {
  SESSION_COOKIE,
  createSessionToken,
  getSession,
} from "@/lib/auth";

const profileSchema = z
  .object({
    username: z.string().min(1, "Username is required"),
    currentPassword: z.string().min(1, "Current password is required"),
    password: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message || "Invalid profile details.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    const result = await updateAdminCredentials({
      currentPassword: parsed.data.currentPassword,
      username: parsed.data.username,
      password: parsed.data.password,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    const token = await createSessionToken({ username: result.username });
    const response = NextResponse.json({
      ok: true,
      user: { username: result.username },
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
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
