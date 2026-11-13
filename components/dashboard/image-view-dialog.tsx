"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCoordinate } from "@/lib/image-utils";
import type { MeterRecord } from "@/lib/types";

type Props = {
  open: boolean;
  record: MeterRecord | null;
  onOpenChange: (open: boolean) => void;
};

export function ImageViewDialog({ open, record, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-[#e6eef3] bg-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#0f3a52]">
            Reference image
          </DialogTitle>
          <DialogDescription className="text-[15px] text-[#6b7c89]">
            {record
              ? `${record.accountNumber} · ${record.accountName}`
              : "No record selected"}
          </DialogDescription>
        </DialogHeader>

        {record?.imageUrl ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.imageUrl}
              alt={`Reference for ${record.accountNumber}`}
              className="max-h-[60vh] w-full rounded-xl border border-[#eef3f6] object-contain bg-[#f7fafc]"
            />
            {(record.latitude || record.longitude || record.landmark) && (
              <div className="rounded-xl bg-[#f3f8fc] px-4 py-3 text-sm text-[#4d6270]">
                {record.landmark ? (
                  <p className="font-medium text-[#0f3a52]">{record.landmark}</p>
                ) : null}
                <p>
                  {[
                    formatCoordinate(record.latitude, "lat"),
                    formatCoordinate(record.longitude, "long"),
                  ]
                    .filter(Boolean)
                    .join("  ")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="py-10 text-center text-[15px] text-[#6b7c89]">
            No reference image attached to this record.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
