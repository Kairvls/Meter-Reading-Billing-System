import { NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-logs";
import { getSession } from "@/lib/auth";
import { isOfflineCopyWriteError } from "@/lib/db/offline-errors";
import { createMeterRecord } from "@/lib/meter-records";
import type { MeterRecord } from "@/lib/types";
import { meterRecordSchema } from "@/lib/validators";
import { z } from "zod";

const bulkSchema = z.object({
  records: z.array(meterRecordSchema).min(1, "No records to import"),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message || "Invalid import data",
        },
        { status: 400 }
      );
    }

    const created: MeterRecord[] = [];
    let offline = false;
    let warning: string | undefined;

    for (const input of parsed.data.records) {
      try {
        const record = await createMeterRecord(input);
        created.push(record);
      } catch (error) {
        if (isOfflineCopyWriteError(error)) {
          created.push(error.record as MeterRecord);
          offline = true;
          warning = error.message;
          continue;
        }
        throw error;
      }
    }

    await writeActivityLog({
      action: "import",
      actor: session.username,
      message: `Imported ${created.length} record${created.length === 1 ? "" : "s"} from Excel`,
    });

    return NextResponse.json(
      {
        ok: true,
        records: created,
        count: created.length,
        ...(offline
          ? {
              offline: true,
              warning:
                warning ||
                "Imported to offline copy only. Sync when the cloud database is available.",
            }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import records";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
