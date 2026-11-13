"use client";

import { useEffect, useRef } from "react";
import {
  ClipboardListIcon,
  ImageIcon,
  PencilIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFullAddress } from "@/lib/address-format";
import { formatCoordinate } from "@/lib/image-utils";
import type { MeterRecord } from "@/lib/types";

type Props = {
  open: boolean;
  record: MeterRecord | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (record: MeterRecord) => void;
  onViewImage?: (record: MeterRecord) => void;
};

function Row({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  const display = value.trim() ? value : "—";
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <p className="text-[12px] font-medium tracking-wide text-[#8aa0ae] uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-medium break-words text-[#0f3a52]">
        {display}
      </p>
    </div>
  );
}

export function RecordViewDialog({
  open,
  record,
  onOpenChange,
  onEdit,
  onViewImage,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, record?.id]);

  if (!record) return null;

  const fullAddress = formatFullAddress(record);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-4 bottom-auto max-h-[calc(100vh-2rem)] translate-y-0 gap-0 overflow-hidden border border-[#e8eef3] bg-white p-0 shadow-[0_24px_64px_rgba(15,58,82,0.14)] duration-300 data-open:slide-in-from-top-6 data-open:zoom-in-100 data-closed:slide-out-to-top-4 data-closed:zoom-out-100 sm:top-6 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="border-b border-[#eef2f6] px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f7fc] text-[#0099cc]">
              <ClipboardListIcon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold text-[#0f3a52]">
                View record
              </DialogTitle>
              <DialogDescription className="mt-1 text-[15px] text-[#6b7c89]">
                Full details for account{" "}
                <span className="font-medium text-[#0f3a52]">
                  {record.accountNumber || "—"}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div
          ref={bodyRef}
          className="max-h-[min(70vh,640px)] space-y-5 overflow-y-auto px-6 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Date" value={record.date} />
            <Row label="Date received" value={record.dateReceived} />
            <Row label="Account number" value={record.accountNumber} />
            <Row label="Account name" value={record.accountName} />
            <Row label="Meter number" value={record.meterNumber} />
            <Row label="Contact number" value={record.contactNumber} />
            <Row label="Meter reader" value={record.meterReader} />
            <Row label="SEP meter reader" value={record.sepMeterReader} />
            <Row label="Remarks" value={record.remarks} wide />
          </div>

          <div className="space-y-3 rounded-xl border border-[#eef2f6] bg-[#f8fafc] p-4">
            <p className="text-[13px] font-semibold tracking-wide text-[#6b7c89] uppercase">
              Address
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Municipality / City" value={record.address} />
              <Row label="Home address" value={record.homeAddress} />
              <Row label="Brgy" value={record.barangay} />
              <Row label="St. / Blk / Sitio / Purok" value={record.streetBlock} />
              <Row label="Landmark" value={record.landmark} wide />
              <Row label="Full address" value={fullAddress} wide />
              <Row
                label="Latitude"
                value={formatCoordinate(record.latitude ?? "", "lat")}
              />
              <Row
                label="Longitude"
                value={formatCoordinate(record.longitude ?? "", "long")}
              />
            </div>
          </div>

          {record.imageUrl ? (
            <div className="space-y-2">
              <p className="text-[12px] font-medium tracking-wide text-[#8aa0ae] uppercase">
                Reference image
              </p>
              <button
                type="button"
                className="group relative block w-full overflow-hidden rounded-xl border border-[#e6eef3] bg-[#f8fafc] text-left"
                onClick={() => onViewImage?.(record)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={record.imageUrl}
                  alt="Reference"
                  className="h-40 w-full object-cover transition group-hover:opacity-90"
                />
                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-[#006699] shadow-sm">
                  <ImageIcon className="size-3.5" />
                  Open image
                </span>
              </button>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[#eef2f6] bg-[#f8fafc] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="border-[#e5eaf0] text-[#3d5a6c]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {onEdit ? (
            <Button
              type="button"
              className="bg-[#0099cc] text-white hover:bg-[#0086b3]"
              onClick={() => {
                onOpenChange(false);
                onEdit(record);
              }}
            >
              <PencilIcon />
              Edit
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
