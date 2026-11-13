"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ImageIcon, LandmarkIcon, MapPinIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
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
  ACCOUNT_NUMBER_MAX_LENGTH,
  formatAccountNumber,
  isValidAccountNumber,
} from "@/lib/account-number";
import { fileToCompressedDataUrl } from "@/lib/image-utils";
import type { MeterRecord, MeterRecordInput } from "@/lib/types";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(date = ""): MeterRecordInput {
  return {
    date,
    accountNumber: "",
    accountName: "",
    address: "",
    meterNumber: "",
    meterReader: "",
    remarks: "",
    contactNumber: "",
    landmark: "",
    latitude: "",
    longitude: "",
    imageUrl: "",
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
  const [form, setForm] = useState<MeterRecordInput>(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        date: initial.date,
        accountNumber: formatAccountNumber(initial.accountNumber),
        accountName: initial.accountName,
        address: initial.address,
        meterNumber: initial.meterNumber,
        meterReader: initial.meterReader,
        remarks: initial.remarks,
        contactNumber: initial.contactNumber,
        landmark: initial.landmark,
        latitude: initial.latitude ?? "",
        longitude: initial.longitude ?? "",
        imageUrl: initial.imageUrl ?? "",
        dateReceived: initial.dateReceived,
      });
    } else {
      setForm(createEmptyForm(todayIsoDate()));
    }
  }, [open, initial]);

  function update<K extends keyof MeterRecordInput>(
    key: K,
    value: MeterRecordInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    setCompressing(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      update("imageUrl", dataUrl);
      toast.success("Reference image attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image failed");
    } finally {
      setCompressing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidAccountNumber(form.accountNumber)) {
      toast.error("Account number must be 00-0000-0000");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        accountNumber: formatAccountNumber(form.accountNumber),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton>
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
              inputMode="numeric"
              autoComplete="off"
              placeholder="00-0000-0000"
              maxLength={ACCOUNT_NUMBER_MAX_LENGTH}
              value={form.accountNumber}
              onChange={(e) =>
                update("accountNumber", formatAccountNumber(e.target.value))
              }
              required
            />
            <p className="text-xs text-[#6b7c89]">Format: 00-0000-0000</p>
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
          <Field label="Latitude" htmlFor="latitude">
            <Input
              id="latitude"
              inputMode="decimal"
              placeholder="e.g. 11.012357"
              value={form.latitude}
              onChange={(e) => update("latitude", e.target.value)}
            />
          </Field>
          <Field label="Longitude" htmlFor="longitude">
            <Input
              id="longitude"
              inputMode="decimal"
              placeholder="e.g. 124.579751"
              value={form.longitude}
              onChange={(e) => update("longitude", e.target.value)}
            />
          </Field>

          <div className="space-y-2 sm:col-span-2">
            <Label>Reference image</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleImageChange(e.target.files?.[0])}
            />
            {form.imageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-[#e6eef3] bg-[#f7fafc]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="Reference"
                  className="max-h-48 w-full object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="bg-white/95"
                    onClick={() => fileRef.current?.click()}
                    disabled={compressing}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="bg-white/95"
                    onClick={() => update("imageUrl", "")}
                    aria-label="Remove image"
                  >
                    <XIcon />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-24 w-full border-dashed border-[#cfe6f2] text-[#006699]"
                onClick={() => fileRef.current?.click()}
                disabled={compressing}
              >
                <ImageIcon />
                {compressing ? "Processing..." : "Upload reference photo"}
              </Button>
            )}
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || compressing}>
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
