import { formatAccountNumber } from "@/lib/account-number";
import type { MeterRecordInput } from "@/lib/types";
import { meterRecordSchema } from "@/lib/validators";

type FieldKey = keyof MeterRecordInput;

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  date: ["date"],
  accountNumber: [
    "account number",
    "account no",
    "account no.",
    "accountnumber",
  ],
  accountName: ["account name", "accountname", "name"],
  address: [
    "address",
    "municipality",
    "municipality/city",
    "city",
    "municipalities/city",
  ],
  homeAddress: ["home address", "homeaddress"],
  barangay: ["brgy", "barangay"],
  streetBlock: [
    "st./blk/sitio/purok",
    "st/blk/sitio/purok",
    "street",
    "blk",
    "sitio",
    "purok",
    "street block",
  ],
  meterNumber: ["meter number", "meter no", "meter no.", "meternumber"],
  meterReader: ["meter reader", "meterreader", "reader"],
  sepMeterReader: ["sep meter reader", "sep reader", "sepmeterreader"],
  remarks: ["remarks", "remark"],
  contactNumber: ["contact number", "contact no", "contact no.", "contact"],
  landmark: ["landmark"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "long", "lng"],
  imageUrl: ["image", "image url", "photo", "reference image"],
  dateReceived: ["date received", "datereceived", "received date"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/:+\s*$/, "")
    .replace(/\s+/g, " ");
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date (days since 1899-12-30)
    if (value > 20000 && value < 80000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const date = new Date(excelEpoch + value * 86400000);
      return toIsoDate(date);
    }
    return String(value);
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return cellToString((value as { result: unknown }).result);
  }
  return String(value).trim();
}

function toIsoDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateValue(raw: string): string {
  const value = raw.trim();
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slash = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    // Prefer DD/MM/YYYY (common PH format); if first > 12 treat as day
    let day: number;
    let month: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      day = a;
      month = b;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed);
  }
  return value;
}

function mapHeaderRow(headers: string[]): Partial<Record<FieldKey, number>> {
  const map: Partial<Record<FieldKey, number>> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized || normalized === "no" || normalized === "no.") return;
    (Object.keys(HEADER_ALIASES) as FieldKey[]).forEach((field) => {
      if (map[field] != null) return;
      if (HEADER_ALIASES[field].includes(normalized)) {
        map[field] = index;
      }
    });
  });
  return map;
}

function scoreHeaderMap(map: Partial<Record<FieldKey, number>>) {
  const required: FieldKey[] = [
    "date",
    "accountNumber",
    "accountName",
    "meterNumber",
    "meterReader",
    "remarks",
    "address",
  ];
  return required.filter((key) => map[key] != null).length;
}

export type ImportParseResult = {
  records: MeterRecordInput[];
  errors: string[];
  skipped: number;
};

export async function parseMeterRecordsFromExcel(
  file: ArrayBuffer
): Promise<ImportParseResult> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { records: [], errors: ["Excel file has no sheets."], skipped: 0 };
  }

  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[];
    // exceljs is 1-indexed; index 0 is unused
    rows.push(values.slice(1).map((cell) => cellToString(cell)));
  });

  if (rows.length === 0) {
    return { records: [], errors: ["Excel sheet is empty."], skipped: 0 };
  }

  let headerIndex = -1;
  let columnMap: Partial<Record<FieldKey, number>> = {};
  let bestScore = 0;

  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const map = mapHeaderRow(rows[i]!.map((cell) => String(cell ?? "")));
    const score = scoreHeaderMap(map);
    if (score > bestScore) {
      bestScore = score;
      headerIndex = i;
      columnMap = map;
    }
    if (score >= 7) break;
  }

  if (headerIndex < 0 || bestScore < 5) {
    return {
      records: [],
      errors: [
        "Could not find a valid header row. Expected columns like Date, Account No., Account Name, Meter No., Reader, Remarks, Address.",
      ],
      skipped: 0,
    };
  }

  const records: MeterRecordInput[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i]!;
    const excelRow = i + 1;

    const get = (field: FieldKey) => {
      const col = columnMap[field];
      if (col == null) return "";
      return String(row[col] ?? "").trim();
    };

    // Stop at footer / signatory sections
    const joined = row.map((c) => String(c ?? "").trim().toLowerCase()).join(" ");
    if (
      joined.includes("prepared by") ||
      joined.includes("checked by") ||
      joined.includes("noted by") ||
      joined.startsWith("received by")
    ) {
      break;
    }

    const raw: MeterRecordInput = {
      date: parseDateValue(get("date")),
      accountNumber: formatAccountNumber(get("accountNumber")),
      accountName: get("accountName"),
      address: get("address"),
      homeAddress: get("homeAddress"),
      barangay: get("barangay"),
      streetBlock: get("streetBlock"),
      meterNumber: get("meterNumber"),
      meterReader: get("meterReader"),
      sepMeterReader: get("sepMeterReader"),
      remarks: get("remarks"),
      contactNumber: get("contactNumber"),
      landmark: get("landmark"),
      latitude: get("latitude").replace(/[^\d.\-]/g, ""),
      longitude: get("longitude").replace(/[^\d.\-]/g, ""),
      imageUrl: get("imageUrl"),
      dateReceived: parseDateValue(get("dateReceived")) || get("dateReceived"),
    };

    const empty =
      !raw.date &&
      !raw.accountNumber &&
      !raw.accountName &&
      !raw.meterNumber &&
      !raw.meterReader &&
      !raw.remarks &&
      !raw.address;
    if (empty) {
      skipped += 1;
      continue;
    }

    // Skip "No."-only continuation or title leftovers
    if (/^summary of/i.test(raw.accountNumber || raw.accountName || "")) {
      skipped += 1;
      continue;
    }

    const parsed = meterRecordSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(
        `Row ${excelRow}: ${parsed.error.issues[0]?.message || "Invalid data"}`
      );
      continue;
    }
    records.push(parsed.data);
  }

  return { records, errors, skipped };
}
