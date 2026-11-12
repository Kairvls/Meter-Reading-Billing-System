export type PeriodFilter = "daily" | "weekly" | "monthly" | "annual" | "all";

export type MeterRecordInput = {
  date: string; // YYYY-MM-DD
  accountNumber: string;
  accountName: string;
  address: string;
  meterNumber: string;
  meterReader: string;
  remarks: string;
  contactNumber: string;
  landmark: string;
  dateReceived: string;
};

export type MeterRecord = MeterRecordInput & {
  id: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SessionUser = {
  username: string;
};

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "reorder"
  | "export"
  | "purge";

export type ActivityLog = {
  id: string;
  action: ActivityAction;
  actor: string;
  message: string;
  recordId?: string;
  accountNumber?: string;
  accountName?: string;
  createdAt: string;
};

export type DeletedMeterRecord = MeterRecord & {
  deletedAt: string;
  deletedBy: string;
};
