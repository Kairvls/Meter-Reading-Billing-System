import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const globalForSqlite = globalThis as unknown as {
  __offlineSqlite?: Database.Database;
};

function resolveDbPath() {
  const configured = process.env.OFFLINE_DB_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), "data", "offline-copy.sqlite");
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (cols.some((col) => col.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meter_records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_name TEXT NOT NULL,
      address TEXT NOT NULL,
      meter_number TEXT NOT NULL,
      meter_reader TEXT NOT NULL,
      remarks TEXT NOT NULL,
      contact_number TEXT NOT NULL DEFAULT '',
      landmark TEXT NOT NULL DEFAULT '',
      latitude TEXT NOT NULL DEFAULT '',
      longitude TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      date_received TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deleted_meter_records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_name TEXT NOT NULL,
      address TEXT NOT NULL,
      meter_number TEXT NOT NULL,
      meter_reader TEXT NOT NULL,
      remarks TEXT NOT NULL,
      contact_number TEXT NOT NULL DEFAULT '',
      landmark TEXT NOT NULL DEFAULT '',
      latitude TEXT NOT NULL DEFAULT '',
      longitude TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      date_received TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT NOT NULL,
      deleted_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      message TEXT NOT NULL,
      record_id TEXT,
      account_number TEXT,
      account_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meter_records_sort
      ON meter_records (sort_order, created_at);
    CREATE INDEX IF NOT EXISTS idx_deleted_meter_records_deleted_at
      ON deleted_meter_records (deleted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
      ON activity_logs (created_at DESC);
  `);

  for (const table of ["meter_records", "deleted_meter_records"] as const) {
    ensureColumn(db, table, "latitude", "TEXT NOT NULL DEFAULT ''");
    ensureColumn(db, table, "longitude", "TEXT NOT NULL DEFAULT ''");
    ensureColumn(db, table, "image_url", "TEXT NOT NULL DEFAULT ''");
  }
}

export function getOfflineDb() {
  if (globalForSqlite.__offlineSqlite) {
    return globalForSqlite.__offlineSqlite;
  }

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);

  globalForSqlite.__offlineSqlite = db;
  return db;
}

export function getOfflineDbPath() {
  return resolveDbPath();
}
