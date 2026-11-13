import { NextResponse } from "next/server";
import { getDatabaseProvider } from "@/lib/db/provider";

export async function GET() {
  const provider = getDatabaseProvider();

  try {
    if (provider === "supabase") {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("meter_records").select("id").limit(1);
      if (error) throw error;
      return NextResponse.json({
        ok: true,
        provider,
        message: "Supabase connected",
      });
    }

    const { collections, getAdminFirestore } = await import("@/lib/firebase");
    const db = getAdminFirestore();
    const snap = await db.collection(collections.meterRecords).limit(1).get();
    return NextResponse.json({
      ok: true,
      provider,
      message: "Firebase connected",
      sampleCount: snap.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, provider, error: message },
      { status: 500 }
    );
  }
}
