import bcrypt from "bcryptjs";
import { getAdminFirestore } from "@/lib/firebase/admin";

const DOC_PATH = { collection: "settings", id: "admin" } as const;

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
    const db = getAdminFirestore();
    const snap = await db
      .collection(DOC_PATH.collection)
      .doc(DOC_PATH.id)
      .get();
    if (!snap.exists) return null;
    const data = snap.data() as Partial<StoredAdmin>;
    if (!data.username || !data.passwordHash) return null;
    return {
      username: data.username,
      passwordHash: data.passwordHash,
      updatedAt: data.updatedAt,
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
  const db = getAdminFirestore();
  await db.collection(DOC_PATH.collection).doc(DOC_PATH.id).set(
    {
      username,
      passwordHash,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { ok: true, username };
}
