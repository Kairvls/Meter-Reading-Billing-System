import { NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-logs";
import { getSession } from "@/lib/auth";
import { restoreMeterRecord } from "@/lib/meter-records";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const record = await restoreMeterRecord(id);
    await writeActivityLog({
      action: "restore",
      actor: session.username,
      message: `Restored record for ${record.accountName} (${record.accountNumber})`,
      recordId: record.id,
      accountNumber: record.accountNumber,
      accountName: record.accountName,
    });

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to restore record";
    const status = message === "Deleted record not found" ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
