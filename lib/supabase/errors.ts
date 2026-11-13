export function formatSupabaseError(error: unknown): string {
  if (!error) return "Unknown Supabase error";

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const anyErr = error as Error & {
      details?: string;
      hint?: string;
      code?: string;
      cause?: unknown;
    };
    const parts = [anyErr.message];
    if (anyErr.details) parts.push(String(anyErr.details));
    if (anyErr.hint) parts.push(String(anyErr.hint));
    if (anyErr.code) parts.push(`code=${anyErr.code}`);
    if (anyErr.cause instanceof Error) parts.push(anyErr.cause.message);
    return parts.filter(Boolean).join(" | ");
  }

  if (typeof error === "object") {
    const obj = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [obj.message, obj.details, obj.hint];
    if (obj.code) parts.push(`code=${obj.code}`);
    const text = parts.filter(Boolean).join(" | ");
    if (text) return text;
  }

  return "Supabase request failed";
}
