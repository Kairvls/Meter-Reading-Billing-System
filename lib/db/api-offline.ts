import { NextResponse } from "next/server";
import { isOfflineCopyWriteError } from "@/lib/db/offline-errors";

export function offlineWriteResponse(
  error: unknown,
  status = 200
): NextResponse | null {
  if (!isOfflineCopyWriteError(error)) return null;
  return NextResponse.json(
    {
      ok: true,
      offline: true,
      record: error.record,
      warning: error.message,
    },
    { status }
  );
}
