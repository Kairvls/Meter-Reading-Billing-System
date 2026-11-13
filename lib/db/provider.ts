export type DatabaseProvider = "firebase" | "supabase";

export function getDatabaseProvider(): DatabaseProvider {
  const raw = (process.env.DATABASE_PROVIDER || "firebase").trim().toLowerCase();
  if (raw === "supabase") return "supabase";
  return "firebase";
}

export function isSupabaseProvider() {
  return getDatabaseProvider() === "supabase";
}
