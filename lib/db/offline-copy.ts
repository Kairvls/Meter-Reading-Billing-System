import { randomUUID } from "node:crypto";
import { getOfflineDb } from "@/lib/db/sqlite";
import type {
  ActivityLog,
  DeletedMeterRecord,
  MeterRecord,
  MeterRecordInput,
} from "@/lib/types";

type MeterRow = {
  id: string;
  date: string;
  account_number: string;
  account_name: string;
  address: string;
  home_address: string;
  barangay: string;
  street_block: string;
  meter_number: string;
  meter_reader: string;
  sep_meter_reader: string;
  remarks: string;
  contact_number: string;
  landmark: string;
  latitude: string;
  longitude: string;
  image_url: string;
  date_received: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type DeletedRow = MeterRow & {
  deleted_at: string;
  deleted_by: string;
};

type LogRow = {
  id: string;
  action: string;
  actor: string;
  message: string;
  record_id: string | null;
  account_number: string | null;
  account_name: string | null;
  created_at: string;
};

function rowToRecord(row: MeterRow): MeterRecord {
  return {
    id: row.id,
    date: row.date,
    accountNumber: row.account_number,
    accountName: row.account_name,
    address: row.address,
    homeAddress: row.home_address ?? "",
    barangay: row.barangay ?? "",
    streetBlock: row.street_block ?? "",
    meterNumber: row.meter_number,
    meterReader: row.meter_reader,
    sepMeterReader: row.sep_meter_reader ?? "",
    remarks: row.remarks,
    contactNumber: row.contact_number,
    landmark: row.landmark,
    latitude: row.latitude ?? "",
    longitude: row.longitude ?? "",
    imageUrl: row.image_url ?? "",
    dateReceived: row.date_received,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToDeleted(row: DeletedRow): DeletedMeterRecord {
  return {
    ...rowToRecord(row),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
}

function rowToLog(row: LogRow): ActivityLog {
  return {
    id: row.id,
    action: row.action as ActivityLog["action"],
    actor: row.actor,
    message: row.message,
    recordId: row.record_id || undefined,
    accountNumber: row.account_number || undefined,
    accountName: row.account_name || undefined,
    createdAt: row.created_at,
  };
}

export function replaceMeterRecordsCopy(records: MeterRecord[]) {
  const db = getOfflineDb();
  const clear = db.prepare("DELETE FROM meter_records");
  const insert = db.prepare(`
    INSERT INTO meter_records (
      id, date, account_number, account_name, address, home_address, barangay, street_block, meter_number,
      meter_reader, sep_meter_reader, remarks, contact_number, landmark, latitude, longitude,
      image_url, date_received, sort_order, created_at, updated_at
    ) VALUES (
      @id, @date, @accountNumber, @accountName, @address, @homeAddress, @barangay, @streetBlock, @meterNumber,
      @meterReader, @sepMeterReader, @remarks, @contactNumber, @landmark, @latitude, @longitude,
      @imageUrl, @dateReceived, @sortOrder, @createdAt, @updatedAt
    )
  `);

  const tx = db.transaction((rows: MeterRecord[]) => {
    clear.run();
    for (const record of rows) {
      insert.run(record);
    }
  });
  tx(records);
}

export function upsertMeterRecordCopy(record: MeterRecord) {
  const db = getOfflineDb();
  db.prepare(`
    INSERT INTO meter_records (
      id, date, account_number, account_name, address, home_address, barangay, street_block, meter_number,
      meter_reader, sep_meter_reader, remarks, contact_number, landmark, latitude, longitude,
      image_url, date_received, sort_order, created_at, updated_at
    ) VALUES (
      @id, @date, @accountNumber, @accountName, @address, @homeAddress, @barangay, @streetBlock, @meterNumber,
      @meterReader, @sepMeterReader, @remarks, @contactNumber, @landmark, @latitude, @longitude,
      @imageUrl, @dateReceived, @sortOrder, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      account_number = excluded.account_number,
      account_name = excluded.account_name,
      address = excluded.address,
      home_address = excluded.home_address,
      barangay = excluded.barangay,
      street_block = excluded.street_block,
      meter_number = excluded.meter_number,
      meter_reader = excluded.meter_reader,
      sep_meter_reader = excluded.sep_meter_reader,
      remarks = excluded.remarks,
      contact_number = excluded.contact_number,
      landmark = excluded.landmark,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      image_url = excluded.image_url,
      date_received = excluded.date_received,
      sort_order = excluded.sort_order,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `).run(record);
}

export function deleteMeterRecordCopy(id: string) {
  getOfflineDb().prepare("DELETE FROM meter_records WHERE id = ?").run(id);
}

export function listMeterRecordsCopy(): MeterRecord[] {
  const rows = getOfflineDb()
    .prepare(
      `SELECT * FROM meter_records
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all() as MeterRow[];
  return rows.map(rowToRecord);
}

export function createMeterRecordOffline(
  input: MeterRecordInput,
  sortOrder: number
): MeterRecord {
  const now = new Date().toISOString();
  const record: MeterRecord = {
    id: randomUUID(),
    ...input,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  upsertMeterRecordCopy(record);
  return record;
}

export function updateMeterRecordOffline(
  id: string,
  input: MeterRecordInput
): MeterRecord | null {
  const existing = listMeterRecordsCopy().find((r) => r.id === id);
  if (!existing) return null;
  const record: MeterRecord = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  upsertMeterRecordCopy(record);
  return record;
}

export function replaceDeletedMeterRecordsCopy(records: DeletedMeterRecord[]) {
  const db = getOfflineDb();
  const clear = db.prepare("DELETE FROM deleted_meter_records");
  const insert = db.prepare(`
    INSERT INTO deleted_meter_records (
      id, date, account_number, account_name, address, home_address, barangay, street_block, meter_number,
      meter_reader, sep_meter_reader, remarks, contact_number, landmark, latitude, longitude,
      image_url, date_received, sort_order, created_at, updated_at,
      deleted_at, deleted_by
    ) VALUES (
      @id, @date, @accountNumber, @accountName, @address, @homeAddress, @barangay, @streetBlock, @meterNumber,
      @meterReader, @sepMeterReader, @remarks, @contactNumber, @landmark, @latitude, @longitude,
      @imageUrl, @dateReceived, @sortOrder, @createdAt, @updatedAt,
      @deletedAt, @deletedBy
    )
  `);

  const tx = db.transaction((rows: DeletedMeterRecord[]) => {
    clear.run();
    for (const record of rows) {
      insert.run(record);
    }
  });
  tx(records);
}

export function upsertDeletedMeterRecordCopy(record: DeletedMeterRecord) {
  const db = getOfflineDb();
  db.prepare(`
    INSERT INTO deleted_meter_records (
      id, date, account_number, account_name, address, home_address, barangay, street_block, meter_number,
      meter_reader, sep_meter_reader, remarks, contact_number, landmark, latitude, longitude,
      image_url, date_received, sort_order, created_at, updated_at,
      deleted_at, deleted_by
    ) VALUES (
      @id, @date, @accountNumber, @accountName, @address, @homeAddress, @barangay, @streetBlock, @meterNumber,
      @meterReader, @sepMeterReader, @remarks, @contactNumber, @landmark, @latitude, @longitude,
      @imageUrl, @dateReceived, @sortOrder, @createdAt, @updatedAt,
      @deletedAt, @deletedBy
    )
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      account_number = excluded.account_number,
      account_name = excluded.account_name,
      address = excluded.address,
      home_address = excluded.home_address,
      barangay = excluded.barangay,
      street_block = excluded.street_block,
      meter_number = excluded.meter_number,
      meter_reader = excluded.meter_reader,
      sep_meter_reader = excluded.sep_meter_reader,
      remarks = excluded.remarks,
      contact_number = excluded.contact_number,
      landmark = excluded.landmark,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      image_url = excluded.image_url,
      date_received = excluded.date_received,
      sort_order = excluded.sort_order,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      deleted_by = excluded.deleted_by
  `).run(record);
}

export function deleteDeletedMeterRecordCopy(id: string) {
  getOfflineDb()
    .prepare("DELETE FROM deleted_meter_records WHERE id = ?")
    .run(id);
}

export function listDeletedMeterRecordsCopy(): DeletedMeterRecord[] {
  const rows = getOfflineDb()
    .prepare(
      `SELECT * FROM deleted_meter_records
       ORDER BY deleted_at DESC`
    )
    .all() as DeletedRow[];
  return rows.map(rowToDeleted);
}

export function softDeleteMeterRecordOffline(
  id: string,
  deletedBy: string
): DeletedMeterRecord | null {
  const existing = listMeterRecordsCopy().find((r) => r.id === id);
  if (!existing) return null;
  const deleted: DeletedMeterRecord = {
    ...existing,
    deletedAt: new Date().toISOString(),
    deletedBy,
  };
  deleteMeterRecordCopy(id);
  upsertDeletedMeterRecordCopy(deleted);
  return deleted;
}

export function restoreMeterRecordOffline(id: string): MeterRecord | null {
  const deleted = listDeletedMeterRecordsCopy().find((r) => r.id === id);
  if (!deleted) return null;
  const { deletedAt: _d, deletedBy: _b, ...rest } = deleted;
  const record: MeterRecord = {
    ...rest,
    updatedAt: new Date().toISOString(),
  };
  upsertMeterRecordCopy(record);
  deleteDeletedMeterRecordCopy(id);
  return record;
}

export function purgeDeletedMeterRecordOffline(
  id: string
): DeletedMeterRecord | null {
  const deleted = listDeletedMeterRecordsCopy().find((r) => r.id === id);
  if (!deleted) return null;
  deleteDeletedMeterRecordCopy(id);
  return deleted;
}

export function reorderMeterRecordsOffline(orderedIds: string[]) {
  const db = getOfflineDb();
  const update = db.prepare(
    `UPDATE meter_records
     SET sort_order = ?, updated_at = ?
     WHERE id = ?`
  );
  const now = new Date().toISOString();
  const tx = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => {
      update.run(index, now, id);
    });
  });
  tx(orderedIds);
}

export function replaceActivityLogsCopy(logs: ActivityLog[]) {
  const db = getOfflineDb();
  const clear = db.prepare("DELETE FROM activity_logs");
  const insert = db.prepare(`
    INSERT INTO activity_logs (
      id, action, actor, message, record_id, account_number, account_name, created_at
    ) VALUES (
      @id, @action, @actor, @message, @recordId, @accountNumber, @accountName, @createdAt
    )
  `);

  const tx = db.transaction((rows: ActivityLog[]) => {
    clear.run();
    for (const log of rows) {
      insert.run({
        id: log.id,
        action: log.action,
        actor: log.actor,
        message: log.message,
        recordId: log.recordId ?? null,
        accountNumber: log.accountNumber ?? null,
        accountName: log.accountName ?? null,
        createdAt: log.createdAt,
      });
    }
  });
  tx(logs);
}

export function insertActivityLogCopy(
  log: Omit<ActivityLog, "id"> & { id?: string }
): ActivityLog {
  const record: ActivityLog = {
    id: log.id || randomUUID(),
    action: log.action,
    actor: log.actor,
    message: log.message,
    recordId: log.recordId,
    accountNumber: log.accountNumber,
    accountName: log.accountName,
    createdAt: log.createdAt,
  };

  getOfflineDb()
    .prepare(
      `INSERT INTO activity_logs (
        id, action, actor, message, record_id, account_number, account_name, created_at
      ) VALUES (
        @id, @action, @actor, @message, @recordId, @accountNumber, @accountName, @createdAt
      )`
    )
    .run({
      id: record.id,
      action: record.action,
      actor: record.actor,
      message: record.message,
      recordId: record.recordId ?? null,
      accountNumber: record.accountNumber ?? null,
      accountName: record.accountName ?? null,
      createdAt: record.createdAt,
    });

  return record;
}

export function listActivityLogsCopy(limit = 100): ActivityLog[] {
  const rows = getOfflineDb()
    .prepare(
      `SELECT * FROM activity_logs
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit) as LogRow[];
  return rows.map(rowToLog);
}

export function hasMeterRecordsCopy() {
  const row = getOfflineDb()
    .prepare("SELECT COUNT(*) AS count FROM meter_records")
    .get() as { count: number };
  return row.count > 0;
}

export function hasDeletedMeterRecordsCopy() {
  const row = getOfflineDb()
    .prepare("SELECT COUNT(*) AS count FROM deleted_meter_records")
    .get() as { count: number };
  return row.count > 0;
}

export function hasActivityLogsCopy() {
  const row = getOfflineDb()
    .prepare("SELECT COUNT(*) AS count FROM activity_logs")
    .get() as { count: number };
  return row.count > 0;
}
