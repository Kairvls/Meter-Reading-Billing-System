/** Canonical Firestore collection names for the meter reading & billing system. */
export const collections = {
  users: "users",
  meterRecords: "meterRecords",
  deletedMeterRecords: "deletedMeterRecords",
  activityLogs: "activityLogs",
  admins: "admins",
} as const;

export type CollectionName = (typeof collections)[keyof typeof collections];
