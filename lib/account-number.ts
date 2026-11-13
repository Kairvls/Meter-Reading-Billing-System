/** Format: 00-0000-0000 (10 digits with auto hyphens). */

export const ACCOUNT_NUMBER_PATTERN = /^\d{2}-\d{4}-\d{4}$/;
export const ACCOUNT_NUMBER_MAX_DIGITS = 10;
export const ACCOUNT_NUMBER_MAX_LENGTH = 12; // including hyphens

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, ACCOUNT_NUMBER_MAX_DIGITS);
}

export function formatAccountNumber(value: string) {
  const digits = digitsOnly(value);
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 6);
  const p3 = digits.slice(6, 10);
  if (digits.length <= 2) return p1;
  if (digits.length <= 6) return `${p1}-${p2}`;
  return `${p1}-${p2}-${p3}`;
}

export function isValidAccountNumber(value: string) {
  return ACCOUNT_NUMBER_PATTERN.test(value.trim());
}
