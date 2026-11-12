import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { reorderMeterRecords } from "@/lib/meter-records";

const schema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid reorder payload" },
        { status: 400 }
      );
    }

    await reorderMeterRecords(parsed.data.orderedIds);
    // Skip logging every drag reorder — it burns write quota quickly in free tier.

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
