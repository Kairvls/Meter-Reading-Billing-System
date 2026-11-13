import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/errors";
import type { LookupItem, LookupKind } from "@/lib/lookups";

type Row = {
  id: string;
  kind: string;
  name: string;
  created_at: string;
};

function toItem(row: Row): LookupItem {
  return {
    id: row.id,
    kind: row.kind as LookupKind,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function listLookups(kind: LookupKind): Promise<LookupItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lookup_values")
    .select("id, kind, name, created_at")
    .eq("kind", kind)
    .order("name", { ascending: true });
  if (error) throw new Error(formatSupabaseError(error));
  return ((data || []) as Row[]).map(toItem);
}

export async function createLookup(
  kind: LookupKind,
  name: string
): Promise<LookupItem> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  const supabase = getSupabaseAdmin();
  const existing = await listLookups(kind);
  const duplicate = existing.find(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return duplicate;

  const row = {
    id: randomUUID(),
    kind,
    name: trimmed,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("lookup_values")
    .insert(row)
    .select("id, kind, name, created_at")
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return toItem(data as Row);
}

export async function deleteLookup(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("lookup_values").delete().eq("id", id);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function replaceLookups(
  kind: LookupKind,
  names: string[]
): Promise<LookupItem[]> {
  const cleaned = Array.from(
    new Set(
      names
        .map((n) => n.trim())
        .filter(Boolean)
    )
  );

  const supabase = getSupabaseAdmin();
  const { error: delError } = await supabase
    .from("lookup_values")
    .delete()
    .eq("kind", kind);
  if (delError) throw new Error(formatSupabaseError(delError));

  if (cleaned.length === 0) return [];

  const rows = cleaned.map((name) => ({
    id: randomUUID(),
    kind,
    name,
    created_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("lookup_values")
    .insert(rows)
    .select("id, kind, name, created_at");
  if (error) throw new Error(formatSupabaseError(error));
  return ((data || []) as Row[])
    .map(toItem)
    .sort((a, b) => a.name.localeCompare(b.name));
}
