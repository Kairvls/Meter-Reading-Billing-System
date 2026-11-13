import { LookupsMaintenance } from "@/components/dashboard/lookups-maintenance";

export default function AddressesPage() {
  return (
    <LookupsMaintenance
      kind="address"
      title="Addresses"
      description="Maintain the address list used by the Address dropdown on create/edit."
    />
  );
}
