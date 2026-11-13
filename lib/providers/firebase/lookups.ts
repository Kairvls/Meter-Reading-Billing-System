import { randomUUID } from "node:crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { LookupItem, LookupKind } from "@/lib/lookups";

const COLLECTION = "lookup_values";

export async function listLookups(kind: LookupKind): Promise<LookupItem[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTION).where("kind", "==", kind).get();
  const items = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      kind: (data.kind as LookupKind) || kind,
      name: String(data.name ?? ""),
      createdAt: String(data.createdAt ?? ""),
    };
  });
  return items
    .filter((item) => item.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createLookup(
  kind: LookupKind,
  name: string
): Promise<LookupItem> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  const existing = await listLookups(kind);
  const duplicate = existing.find(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return duplicate;

  const db = getAdminFirestore();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await db.collection(COLLECTION).doc(id).set({
    kind,
    name: trimmed,
    createdAt,
  });
  return { id, kind, name: trimmed, createdAt };
}

export async function deleteLookup(id: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(id).delete();
}

export async function replaceLookups(
  kind: LookupKind,
  names: string[]
): Promise<LookupItem[]> {
  const cleaned = Array.from(
    new Set(names.map((n) => n.trim()).filter(Boolean))
  );
  const db = getAdminFirestore();
  const existing = await db
    .collection(COLLECTION)
    .where("kind", "==", kind)
    .get();

  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));
  const createdAt = new Date().toISOString();
  const items: LookupItem[] = cleaned.map((name) => {
    const id = randomUUID();
    batch.set(db.collection(COLLECTION).doc(id), { kind, name, createdAt });
    return { id, kind, name, createdAt };
  });
  await batch.commit();
  return items.sort((a, b) => a.name.localeCompare(b.name));
}
