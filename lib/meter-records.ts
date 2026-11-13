import { getDatabaseProvider } from "@/lib/db/provider";
import type {
  DeletedMeterRecord,
  MeterRecord,
  MeterRecordInput,
  PeriodFilter,
} from "@/lib/types";

type MeterRecordsApi = {
  listMeterRecords: (period?: PeriodFilter) => Promise<MeterRecord[]>;
  createMeterRecord: (input: MeterRecordInput) => Promise<MeterRecord>;
  updateMeterRecord: (
    id: string,
    input: MeterRecordInput
  ) => Promise<MeterRecord>;
  softDeleteMeterRecord: (
    id: string,
    deletedBy: string
  ) => Promise<DeletedMeterRecord>;
  listDeletedMeterRecords: () => Promise<DeletedMeterRecord[]>;
  restoreMeterRecord: (id: string) => Promise<MeterRecord>;
  purgeDeletedMeterRecord: (id: string) => Promise<DeletedMeterRecord>;
  deleteMeterRecord: (id: string) => Promise<void>;
  reorderMeterRecords: (orderedIds: string[]) => Promise<void>;
};

async function api(): Promise<MeterRecordsApi> {
  if (getDatabaseProvider() === "supabase") {
    return import("@/lib/providers/supabase/meter-records");
  }
  return import("@/lib/providers/firebase/meter-records");
}

export async function listMeterRecords(period: PeriodFilter = "all") {
  return (await api()).listMeterRecords(period);
}

export async function createMeterRecord(input: MeterRecordInput) {
  return (await api()).createMeterRecord(input);
}

export async function updateMeterRecord(id: string, input: MeterRecordInput) {
  return (await api()).updateMeterRecord(id, input);
}

export async function softDeleteMeterRecord(id: string, deletedBy: string) {
  return (await api()).softDeleteMeterRecord(id, deletedBy);
}

export async function listDeletedMeterRecords() {
  return (await api()).listDeletedMeterRecords();
}

export async function restoreMeterRecord(id: string) {
  return (await api()).restoreMeterRecord(id);
}

export async function purgeDeletedMeterRecord(id: string) {
  return (await api()).purgeDeletedMeterRecord(id);
}

export async function deleteMeterRecord(id: string) {
  return (await api()).deleteMeterRecord(id);
}

export async function reorderMeterRecords(orderedIds: string[]) {
  return (await api()).reorderMeterRecords(orderedIds);
}
