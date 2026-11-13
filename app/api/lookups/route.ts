import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createLookup,
  listLookups,
  replaceLookups,
  type LookupKind,
} from "@/lib/lookups";
import { z } from "zod";

const kinds: LookupKind[] = ["meter_reader", "sep_meter_reader", "address"];

function parseKind(value: string | null): LookupKind | null {
  if (!value) return null;
  return kinds.includes(value as LookupKind) ? (value as LookupKind) : null;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kind = parseKind(new URL(request.url).searchParams.get("kind"));
    if (!kind) {
      return NextResponse.json(
        { ok: false, error: "Invalid lookup kind" },
        { status: 400 }
      );
    }
    const items = await listLookups(kind);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load lookups";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

const createSchema = z.object({
  kind: z.enum(["meter_reader", "sep_meter_reader", "address"]),
  name: z.string().min(1, "Name is required"),
});

const replaceSchema = z.object({
  kind: z.enum(["meter_reader", "sep_meter_reader", "address"]),
  names: z.array(z.string()),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (Array.isArray(body?.names)) {
      const parsed = replaceSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: parsed.error.issues[0]?.message || "Invalid data" },
          { status: 400 }
        );
      }
      const items = await replaceLookups(parsed.data.kind, parsed.data.names);
      return NextResponse.json({ ok: true, items });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }
    const item = await createLookup(parsed.data.kind, parsed.data.name);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save lookup";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
