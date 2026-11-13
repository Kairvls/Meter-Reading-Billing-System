import { NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-logs";
import { getSession } from "@/lib/auth";
import { offlineWriteResponse } from "@/lib/db/api-offline";
import { isOfflineCopyWriteError } from "@/lib/db/offline-errors";
import {
  softDeleteMeterRecord,
  updateMeterRecord,
} from "@/lib/meter-records";
import type { DeletedMeterRecord, MeterRecord } from "@/lib/types";
import { meterRecordSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = meterRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const record = await updateMeterRecord(id, parsed.data);
    await writeActivityLog({
      action: "update",
      actor: session.username,
      message: `Updated record for ${record.accountName} (${record.accountNumber})`,
      recordId: record.id,
      accountNumber: record.accountNumber,
      accountName: record.accountName,
    });

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    if (isOfflineCopyWriteError(error)) {
      const record = error.record as MeterRecord;
      await writeActivityLog({
        action: "update",
        actor: session.username,
        message: `Updated record offline for ${record.accountName} (${record.accountNumber})`,
        recordId: record.id,
        accountNumber: record.accountNumber,
        accountName: record.accountName,
      });
      return offlineWriteResponse(error)!;
    }
    const message = error instanceof Error ? error.message : "Failed to update record";
    const status = message === "Record not found" ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const deleted = await softDeleteMeterRecord(id, session.username);
    await writeActivityLog({
      action: "delete",
      actor: session.username,
      message: `Moved to deleted data: ${deleted.accountName} (${deleted.accountNumber})`,
      recordId: deleted.id,
      accountNumber: deleted.accountNumber,
      accountName: deleted.accountName,
    });

    return NextResponse.json({ ok: true, record: deleted });
  } catch (error) {
    if (isOfflineCopyWriteError(error)) {
      const deleted = error.record as DeletedMeterRecord;
      await writeActivityLog({
        action: "delete",
        actor: session.username,
        message: `Moved to deleted data offline: ${deleted.accountName} (${deleted.accountNumber})`,
        recordId: deleted.id,
        accountNumber: deleted.accountNumber,
        accountName: deleted.accountName,
      });
      return offlineWriteResponse(error)!;
    }
    const message = error instanceof Error ? error.message : "Failed to delete record";
    const status = message === "Record not found" ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
