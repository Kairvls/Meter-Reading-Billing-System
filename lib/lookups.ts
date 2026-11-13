import { getDatabaseProvider } from "@/lib/db/provider";

export type LookupKind = "meter_reader" | "sep_meter_reader" | "address";

export type LookupItem = {
  id: string;
  kind: LookupKind;
  name: string;
  createdAt: string;
};

type LookupsApi = {
  listLookups: (kind: LookupKind) => Promise<LookupItem[]>;
  createLookup: (kind: LookupKind, name: string) => Promise<LookupItem>;
  deleteLookup: (id: string) => Promise<void>;
  replaceLookups: (kind: LookupKind, names: string[]) => Promise<LookupItem[]>;
};

async function api(): Promise<LookupsApi> {
  if (getDatabaseProvider() === "supabase") {
    return import("@/lib/providers/supabase/lookups");
  }
  return import("@/lib/providers/firebase/lookups");
}

export async function listLookups(kind: LookupKind) {
  return (await api()).listLookups(kind);
}

export async function createLookup(kind: LookupKind, name: string) {
  return (await api()).createLookup(kind, name);
}

export async function deleteLookup(id: string) {
  return (await api()).deleteLookup(id);
}

export async function replaceLookups(kind: LookupKind, names: string[]) {
  return (await api()).replaceLookups(kind, names);
}
