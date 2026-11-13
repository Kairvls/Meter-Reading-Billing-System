import type { MeterRecordInput } from "@/lib/types";

/** Build a single display line from address parts. */
export function formatFullAddress(
  record: Pick<
    MeterRecordInput,
    "homeAddress" | "barangay" | "streetBlock" | "address" | "landmark"
  >
) {
  return [
    record.homeAddress,
    record.streetBlock,
    record.barangay,
    record.address,
    record.landmark,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}
