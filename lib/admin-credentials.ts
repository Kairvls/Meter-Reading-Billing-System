import { getDatabaseProvider } from "@/lib/db/provider";

type AdminCredentialsApi = {
  getAdminUsername: () => Promise<string>;
  verifyAdminLogin: (
    username: string,
    password: string
  ) => Promise<{ ok: true; username: string } | { ok: false }>;
  updateAdminCredentials: (input: {
    currentPassword: string;
    username: string;
    password: string;
  }) => Promise<{ ok: true; username: string } | { ok: false; error: string }>;
};

async function api(): Promise<AdminCredentialsApi> {
  if (getDatabaseProvider() === "supabase") {
    return import("@/lib/providers/supabase/admin-credentials");
  }
  return import("@/lib/providers/firebase/admin-credentials");
}

export async function getAdminUsername() {
  return (await api()).getAdminUsername();
}

export async function verifyAdminLogin(username: string, password: string) {
  return (await api()).verifyAdminLogin(username, password);
}

export async function updateAdminCredentials(input: {
  currentPassword: string;
  username: string;
  password: string;
}) {
  return (await api()).updateAdminCredentials(input);
}
