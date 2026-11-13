/** First letter capital, rest lowercase (per word optional — for Brgy use sentence style). */

export function firstCapitalRestLower(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
