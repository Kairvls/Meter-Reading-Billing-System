/** Account name display format: Last, First, Middle */

export type AccountNameParts = {
  lastName: string;
  firstName: string;
  middleName: string;
};

export function formatAccountName(parts: AccountNameParts) {
  const last = parts.lastName.trim();
  const first = parts.firstName.trim();
  const middle = parts.middleName.trim();
  const pieces = [last, first, middle].filter(Boolean);
  if (!last && !first) return "";
  if (!middle) return `${last}, ${first}`.replace(/^,\s*|,\s*$/g, "").trim();
  return `${last}, ${first}, ${middle}`;
}

export function parseAccountName(value: string): AccountNameParts {
  const raw = value.trim();
  if (!raw) return { lastName: "", firstName: "", middleName: "" };

  // Preferred: "Last, First, Middle" or "Last, First"
  if (raw.includes(",")) {
    const parts = raw.split(",").map((p) => p.trim());
    return {
      lastName: parts[0] || "",
      firstName: parts[1] || "",
      middleName: parts.slice(2).join(" ").trim(),
    };
  }

  // Fallback: "First Middle Last" / "First Last"
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { lastName: tokens[0]!, firstName: "", middleName: "" };
  }
  if (tokens.length === 2) {
    return { lastName: tokens[1]!, firstName: tokens[0]!, middleName: "" };
  }
  return {
    lastName: tokens[tokens.length - 1]!,
    firstName: tokens[0]!,
    middleName: tokens.slice(1, -1).join(" "),
  };
}
