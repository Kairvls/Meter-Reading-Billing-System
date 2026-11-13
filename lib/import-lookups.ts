const HEADER_RE =
  /^(name|meter reader|sep meter reader|address|reader|municipality|municipality\/city|city|full name)$/i;

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return cellToString((value as { result: unknown }).result);
  }
  return String(value).trim();
}

/** Read unique names from the first column of an .xlsx sheet. */
export async function parseLookupNamesFromExcel(
  file: ArrayBuffer
): Promise<string[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    const raw = cellToString(row.getCell(1).value);
    if (!raw) return;
    if (rowNumber === 1 && HEADER_RE.test(raw)) return;
    if (HEADER_RE.test(raw)) return;

    const key = raw.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    names.push(raw);
  });

  return names;
}
