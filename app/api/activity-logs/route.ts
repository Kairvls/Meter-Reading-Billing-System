import { NextResponse } from "next/server";
import { z } from "zod";
import { listActivityLogs, writeActivityLog } from "@/lib/activity-logs";
import { getSession } from "@/lib/auth";

const exportLogSchema = z.object({
  action: z.literal("export"),
  format: z.enum(["pdf", "excel", "print"]),
  count: z.number().int().nonnegative(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await listActivityLogs();
    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load activity logs";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = exportLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid activity payload" },
        { status: 400 }
      );
    }

    await writeActivityLog({
      action: "export",
      actor: session.username,
      message: `Exported ${parsed.data.count} record${parsed.data.count === 1 ? "" : "s"} as ${parsed.data.format.toUpperCase()}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to write activity log";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
