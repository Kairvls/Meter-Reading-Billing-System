import { NextResponse } from "next/server";
import { collections, getAdminFirestore } from "@/lib/firebase";

export async function GET() {
  try {
    const db = getAdminFirestore();
    const ref = db.collection(collections.users).doc("_healthcheck");

    await ref.set(
      {
        ok: true,
        checkedAt: new Date().toISOString(),
        source: "api/health/firebase",
      },
      { merge: true }
    );

    const snap = await ref.get();

    return NextResponse.json({
      ok: true,
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? null,
      firestore: {
        connected: snap.exists,
        document: snap.data() ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
