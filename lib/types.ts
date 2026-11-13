export type PeriodFilter = "daily" | "weekly" | "monthly" | "annual" | "all";

export type MeterRecordInput = {
  date: string; // YYYY-MM-DD
  accountNumber: string; // 00-0000-0000
  accountName: string; // Last, First, Middle
  /** Municipality / City (dropdown maintenance list) */
  address: string;
  homeAddress: string;
  barangay: string;
  streetBlock: string; // St./Blk/Sitio/Purok
  meterNumber: string;
  meterReader: string;
  sepMeterReader: string;
  remarks: string;
  contactNumber: string;
  landmark: string;
  latitude: string;
  longitude: string;
  imageUrl: string; // compressed data URL or remote URL
  dateReceived: string; // YYYY-MM-DD
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
  | "import"
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
