"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_EXPORT_SIGNATORIES,
  loadExportSignatories,
  saveExportSignatories,
  type ExportSignatories,
} from "@/lib/export-signatories";

type ExportKind = "pdf" | "excel" | "print";

type Props = {
  open: boolean;
  kind: ExportKind | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signatories: ExportSignatories, kind: ExportKind) => void;
};

const KIND_LABEL: Record<ExportKind, string> = {
  pdf: "PDF",
  excel: "Excel",
  print: "Print",
};

export function ExportSignatoriesDialog({
  open,
  kind,
  onOpenChange,
  onConfirm,
}: Props) {
  const [form, setForm] = useState<ExportSignatories>(DEFAULT_EXPORT_SIGNATORIES);

  useEffect(() => {
    if (!open) return;
    setForm(loadExportSignatories());
  }, [open]);

  function updateSignatory(
    key: "preparedBy" | "checkedBy" | "notedBy",
    field: "name" | "title" | "label",
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function handleConfirm() {
    if (!kind) return;
    saveExportSignatories(form);
    onConfirm(form, kind);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-[#e6eef3] bg-white p-5 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#0f3a52]">
            Export signatories
            {kind ? ` · ${KIND_LABEL[kind]}` : ""}
          </DialogTitle>
          <DialogDescription className="text-[15px] text-[#6b7c89]">
            Customize Prepared by / Checked by / Noted by before export. PDF and
            browser print cannot be edited after generating.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {(
            [
              ["preparedBy", "Prepared by"],
              ["checkedBy", "Checked by"],
              ["notedBy", "Noted by"],
            ] as const
          ).map(([key, heading]) => (
            <div
              key={key}
              className="space-y-2 rounded-xl border border-[#eef3f6] bg-[#f7fafc] p-4"
            >
              <p className="text-sm font-semibold text-[#006699]">{heading}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`${key}-name`}>Name</Label>
                  <Input
                    id={`${key}-name`}
                    value={form[key].name}
                    onChange={(e) => updateSignatory(key, "name", e.target.value)}
                    className="h-10 text-[15px] md:text-[15px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`${key}-title`}>
                    Position / title (one line each)
                  </Label>
                  <textarea
                    id={`${key}-title`}
                    value={form[key].title}
                    onChange={(e) =>
                      updateSignatory(key, "title", e.target.value)
                    }
                    rows={2}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[64px] w-full rounded-md border px-3 py-2 text-[15px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="received-by">Received by (optional)</Label>
            <Input
              id="received-by"
              value={form.receivedBy}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, receivedBy: e.target.value }))
              }
              placeholder="e.g. CWD 09/02/26"
              className="h-10 text-[15px] md:text-[15px]"
            />
          </div>
        </div>

        <DialogFooter className="border-[#eef3f6] bg-[#f7fafc]">
          <Button
            type="button"
            variant="outline"
            className="border-[#cfe6f2] text-[15px] text-[#006699]"
            onClick={() => setForm(DEFAULT_EXPORT_SIGNATORIES)}
          >
            Reset defaults
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#cfe6f2] text-[15px] text-[#006699]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#0099cc] text-[15px] text-white hover:bg-[#0086b3]"
            disabled={!kind}
            onClick={handleConfirm}
          >
            {kind === "print"
              ? "Continue to print"
              : `Export ${kind ? KIND_LABEL[kind] : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
