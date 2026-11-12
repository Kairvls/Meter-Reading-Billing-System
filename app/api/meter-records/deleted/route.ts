import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listDeletedMeterRecords } from "@/lib/meter-records";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const records = await listDeletedMeterRecords();
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load deleted records";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
