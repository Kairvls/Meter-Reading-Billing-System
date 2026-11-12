import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = value;
}

function excelDate(n) {
  if (typeof n === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  if (!n) return null;
  const s = String(n);
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    return new Date(Date.UTC(y, Number(m[1]) - 1, Number(m[2])))
      .toISOString()
      .slice(0, 10);
  }
  return s;
}

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const db = getFirestore();
const wb = XLSX.readFile(
  "C:/Users/aljon/Downloads/NOVEMBER 2026 (1).xlsx"
);

const sheetNames = [
  "November 2026 recieved",
  "November (2) recieved",
  "November (4)",
  "November (3)",
  "November (5)",
  "November (6)",
];

const LIMIT = 400;
const records = [];

for (const name of sheetNames) {
  const ws = wb.Sheets[name];
  if (!ws) continue;
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  for (let i = 6; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[3] || !r[4]) continue;
    const date = excelDate(r[2]);
    if (!date) continue;
    records.push({
      date,
      accountNumber: String(r[3]).trim(),
      accountName: String(r[4] ?? "").trim(),
      address: String(r[5] ?? "").trim(),
      meterNumber: String(r[6] ?? "").trim(),
      meterReader: String(r[7] ?? r[8] ?? "").trim(),
      remarks: String(r[8] ?? r[9] ?? "").trim(),
      contactNumber: r[9] != null ? String(r[9]) : r[10] != null ? String(r[10]) : "",
      landmark: r[10] != null ? String(r[10]) : r[11] != null ? String(r[11]) : "",
      dateReceived: r[11] != null ? String(r[11]) : r[12] != null ? String(r[12]) : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (records.length >= LIMIT) break;
  }
  if (records.length >= LIMIT) break;
}

console.log(`Importing ${records.length} records...`);

const batchSize = 400;
for (let i = 0; i < records.length; i += batchSize) {
  const chunk = records.slice(i, i + batchSize);
  const batch = db.batch();
  for (const item of chunk) {
    const ref = db.collection("meterRecords").doc();
    batch.set(ref, item);
  }
  await batch.commit();
  console.log(`Committed ${Math.min(i + batchSize, records.length)}/${records.length}`);
}

console.log("IMPORT_DONE");
