import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteLookup } from "@/lib/lookups";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }
    await deleteLookup(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete lookup";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
