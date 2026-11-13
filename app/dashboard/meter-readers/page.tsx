"use client";

import { useState } from "react";
import { LookupsMaintenance } from "@/components/dashboard/lookups-maintenance";
import type { LookupKind } from "@/lib/lookups";

const tabs: { id: LookupKind; label: string }[] = [
  { id: "meter_reader", label: "Meter readers" },
  { id: "sep_meter_reader", label: "SEP meter readers" },
];

export default function MeterReadersPage() {
  const [tab, setTab] = useState<LookupKind>("meter_reader");

  return (
    <div className="space-y-4 py-2">
      <div className="mx-auto flex w-full max-w-3xl gap-2 px-4 sm:px-6">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === item.id
                ? "bg-[#0099cc] text-white"
                : "bg-white text-[#4d6f84] ring-1 ring-[#cfe6f2] hover:bg-[#e8f7fc]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <LookupsMaintenance
        key={tab}
        kind={tab}
        title={tab === "meter_reader" ? "Meter readers" : "SEP meter readers"}
        description={
          tab === "meter_reader"
            ? "Maintain the list used by the Meter reader dropdown on create/edit."
            : "Maintain the list used by the SEP meter reader dropdown on create/edit."
        }
      />
    </div>
  );
}
