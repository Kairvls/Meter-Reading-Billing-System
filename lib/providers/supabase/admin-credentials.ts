import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type StoredAdmin = {
  username: string;
  passwordHash: string;
  updatedAt?: string;
};

function envCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
  };
}

async function getStoredAdmin(): Promise<StoredAdmin | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("username, password_hash, updated_at")
      .eq("id", "admin")
      .maybeSingle();
    if (error || !data?.username || !data?.password_hash) return null;
    return {
      username: data.username,
      passwordHash: data.password_hash,
      updatedAt: data.updated_at ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getAdminUsername(): Promise<string> {
  const stored = await getStoredAdmin();
  if (stored) return stored.username;
  return envCredentials().username;
}

export async function verifyAdminLogin(
  username: string,
  password: string
): Promise<{ ok: true; username: string } | { ok: false }> {
  const stored = await getStoredAdmin();
  if (stored) {
    if (username !== stored.username) return { ok: false };
    const match = await bcrypt.compare(password, stored.passwordHash);
    if (!match) return { ok: false };
    return { ok: true, username: stored.username };
  }

  const env = envCredentials();
  if (username !== env.username || password !== env.password) {
    return { ok: false };
  }
  return { ok: true, username: env.username };
}

export async function updateAdminCredentials(input: {
  currentPassword: string;
  username: string;
  password: string;
}): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const verified = await verifyAdminLogin(
    await getAdminUsername(),
    input.currentPassword
  );
  if (!verified.ok) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const username = input.username.trim();
  if (!username) {
    return { ok: false, error: "Username is required." };
  }
  if (input.password.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters." };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("admin_settings").upsert({
    id: "admin",
    username,
    password_hash: passwordHash,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, username };
}
