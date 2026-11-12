"use client";

import { FormEvent, useEffect, useState } from "react";
import { LandmarkIcon, MapPinIcon } from "lucide-react";
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
import type { MeterRecord, MeterRecordInput } from "@/lib/types";

function createEmptyForm(): MeterRecordInput {
  return {
    date: new Date().toISOString().slice(0, 10),
    accountNumber: "",
    accountName: "",
    address: "",
    meterNumber: "",
    meterReader: "",
    remarks: "",
    contactNumber: "",
    landmark: "",
    dateReceived: "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: MeterRecord | null;
  onSubmit: (values: MeterRecordInput) => Promise<void>;
};

export function RecordFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<MeterRecordInput>(() => ({
    date: "",
    accountNumber: "",
    accountName: "",
    address: "",
    meterNumber: "",
    meterReader: "",
    remarks: "",
    contactNumber: "",
    landmark: "",
    dateReceived: "",
  }));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        date: initial.date,
        accountNumber: initial.accountNumber,
        accountName: initial.accountName,
        address: initial.address,
        meterNumber: initial.meterNumber,
        meterReader: initial.meterReader,
        remarks: initial.remarks,
        contactNumber: initial.contactNumber,
        landmark: initial.landmark,
        dateReceived: initial.dateReceived,
      });
    } else {
      setForm(createEmptyForm());
    }
  }, [open, initial]);

  function update<K extends keyof MeterRecordInput>(
    key: K,
    value: MeterRecordInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit record" : "Create record"}</DialogTitle>
          <DialogDescription>
            Fill in the defective meter details, then save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="date">
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              required
            />
          </Field>
          <Field label="Account number" htmlFor="accountNumber">
            <Input
              id="accountNumber"
              value={form.accountNumber}
              onChange={(e) => update("accountNumber", e.target.value)}
              required
            />
          </Field>
          <Field label="Account name" htmlFor="accountName">
            <Input
              id="accountName"
              value={form.accountName}
              onChange={(e) => update("accountName", e.target.value)}
              required
            />
          </Field>
          <Field label="Meter number" htmlFor="meterNumber">
            <Input
              id="meterNumber"
              value={form.meterNumber}
              onChange={(e) => update("meterNumber", e.target.value)}
              required
            />
          </Field>
          <Field label="Meter reader" htmlFor="meterReader">
            <Input
              id="meterReader"
              value={form.meterReader}
              onChange={(e) => update("meterReader", e.target.value)}
              required
            />
          </Field>
          <Field label="Remarks" htmlFor="remarks">
            <Input
              id="remarks"
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              required
            />
          </Field>
          <Field label="Contact number" htmlFor="contactNumber">
            <Input
              id="contactNumber"
              value={form.contactNumber}
              onChange={(e) => update("contactNumber", e.target.value)}
            />
          </Field>
          <Field label="Date received" htmlFor="dateReceived">
            <Input
              id="dateReceived"
              value={form.dateReceived}
              onChange={(e) => update("dateReceived", e.target.value)}
            />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <div className="relative">
              <MapPinIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#0099cc]" />
              <Input
                id="address"
                className="pl-9"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="landmark">Landmark</Label>
            <div className="relative">
              <LandmarkIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#0099cc]" />
              <Input
                id="landmark"
                className="pl-9"
                value={form.landmark}
                onChange={(e) => update("landmark", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
