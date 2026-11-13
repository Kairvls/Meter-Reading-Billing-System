import { LookupsMaintenance } from "@/components/dashboard/lookups-maintenance";

export default function AddressesPage() {
  return (
    <LookupsMaintenance
      kind="address"
      title="Municipalities / Cities"
      description="Maintain the Municipality/City list used by the address dropdown on create/edit."
    />
  );
}
