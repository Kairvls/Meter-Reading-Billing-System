import { NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-logs";
import { getSession } from "@/lib/auth";
import { createMeterRecord, listMeterRecords } from "@/lib/meter-records";
import type { PeriodFilter } from "@/lib/types";
import { meterRecordSchema } from "@/lib/validators";

const periods: PeriodFilter[] = ["daily", "weekly", "monthly", "annual", "all"];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const periodParam = (searchParams.get("period") || "all") as PeriodFilter;
    const period = periods.includes(periodParam) ? periodParam : "all";
    const records = await listMeterRecords(period);
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load records";
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
    const parsed = meterRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const record = await createMeterRecord(parsed.data);
    await writeActivityLog({
      action: "create",
      actor: session.username,
      message: `Created record for ${record.accountName} (${record.accountNumber})`,
      recordId: record.id,
      accountNumber: record.accountNumber,
      accountName: record.accountName,
    });

    return NextResponse.json({ ok: true, record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create record";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
