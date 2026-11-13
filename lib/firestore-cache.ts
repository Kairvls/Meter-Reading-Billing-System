type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = 30_000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function isQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota exceeded")
  );
}

export function isFirebaseUnavailable(error: unknown) {
  return isCloudUnavailable(error);
}

export function isCloudUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    isQuotaError(error) ||
    lower.includes("unavailable") ||
    lower.includes("deadline exceeded") ||
    lower.includes("econnreset") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("firestore request failed") ||
    lower.includes("supabase") ||
    lower.includes("failed to fetch") ||
    lower.includes("connect")
  );
}

export function quotaErrorMessage() {
  return "Firebase quota exceeded. Wait for the daily free-tier reset, or enable Blaze billing in Firebase Console. Reads are now cached briefly to reduce usage.";
}

export function offlineCopyMessage() {
  return "Saved to offline copy only. Sync when Firebase is available.";
}

export function offlineReadMessage() {
  return "Showing offline SQLite copy (Firebase unavailable).";
}
