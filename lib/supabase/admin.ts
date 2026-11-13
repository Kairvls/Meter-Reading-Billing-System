import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as {
  __supabaseAdmin?: SupabaseClient;
};

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const cacheKey = `${url}::${serviceRoleKey.slice(0, 16)}`;
  const cached = globalForSupabase.__supabaseAdmin as
    | (SupabaseClient & { __cacheKey?: string })
    | undefined;
  if (cached?.__cacheKey === cacheKey) {
    return cached;
  }

  const client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as SupabaseClient & { __cacheKey?: string };
  client.__cacheKey = cacheKey;

  globalForSupabase.__supabaseAdmin = client;
  return client;
}
