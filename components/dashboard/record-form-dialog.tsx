"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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
import { SearchableAddSelect } from "@/components/ui/searchable-add-select";
import {
  ACCOUNT_NUMBER_MAX_LENGTH,
  formatAccountNumber,
  isValidAccountNumber,
} from "@/lib/account-number";
import {
  formatAccountName,
  parseAccountName,
  type AccountNameParts,
} from "@/lib/account-name";
import { fileToCompressedDataUrl } from "@/lib/image-utils";
import type { LookupKind } from "@/lib/lookups";
import { firstCapitalRestLower } from "@/lib/title-case";
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
    homeAddress: "",
    barangay: "",
    streetBlock: "",
    meterNumber: "",
    meterReader: "",
    sepMeterReader: "",
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
  const [nameParts, setNameParts] = useState<AccountNameParts>({
    lastName: "",
    firstName: "",
    middleName: "",
  });
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [readers, setReaders] = useState<string[]>([]);
  const [sepReaders, setSepReaders] = useState<string[]>([]);
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initial);

  const loadLookups = useCallback(async () => {
    async function loadKind(kind: LookupKind) {
      const res = await fetch(`/api/lookups?kind=${kind}`);
      const data = await res.json();
      if (!res.ok || !data.ok) return [] as string[];
      return (data.items as Array<{ name: string }>).map((item) => item.name);
    }
    try {
      const [readerNames, sepNames, cityNames] = await Promise.all([
        loadKind("meter_reader"),
        loadKind("sep_meter_reader"),
        loadKind("address"),
      ]);
      setReaders(readerNames);
      setSepReaders(sepNames);
      setMunicipalities(cityNames);
    } catch {
      // keep empty lists; user can still add from dropdown
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadLookups();
    if (initial) {
      setForm({
        date: initial.date,
        accountNumber: formatAccountNumber(initial.accountNumber),
        accountName: initial.accountName,
        address: initial.address,
        homeAddress: initial.homeAddress ?? "",
        barangay: initial.barangay ?? "",
        streetBlock: initial.streetBlock ?? "",
        meterNumber: initial.meterNumber,
        meterReader: initial.meterReader,
        sepMeterReader: initial.sepMeterReader ?? "",
        remarks: initial.remarks,
        contactNumber: initial.contactNumber,
        landmark: initial.landmark,
        latitude: initial.latitude ?? "",
        longitude: initial.longitude ?? "",
        imageUrl: initial.imageUrl ?? "",
        dateReceived: initial.dateReceived || "",
      });
      setNameParts(parseAccountName(initial.accountName));
    } else {
      setForm(createEmptyForm(todayIsoDate()));
      setNameParts({ lastName: "", firstName: "", middleName: "" });
    }
  }, [open, initial, loadLookups]);

  function update<K extends keyof MeterRecordInput>(
    key: K,
    value: MeterRecordInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateNamePart<K extends keyof AccountNameParts>(
    key: K,
    value: string
  ) {
    setNameParts((prev) => {
      const next = { ...prev, [key]: value };
      update("accountName", formatAccountName(next));
      return next;
    });
  }

  async function addLookup(kind: LookupKind, name: string) {
    const res = await fetch("/api/lookups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Failed to add item");
    }
    await loadLookups();
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
    if (!nameParts.lastName.trim() || !nameParts.firstName.trim()) {
      toast.error("Last name and first name are required");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        accountNumber: formatAccountNumber(form.accountNumber),
        accountName: formatAccountName(nameParts),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton
      >
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

          <Field label="Last name" htmlFor="lastName">
            <Input
              id="lastName"
              value={nameParts.lastName}
              onChange={(e) => updateNamePart("lastName", e.target.value)}
              required
            />
          </Field>
          <Field label="First name" htmlFor="firstName">
            <Input
              id="firstName"
              value={nameParts.firstName}
              onChange={(e) => updateNamePart("firstName", e.target.value)}
              required
            />
          </Field>
          <Field label="Middle name" htmlFor="middleName">
            <Input
              id="middleName"
              value={nameParts.middleName}
              onChange={(e) => updateNamePart("middleName", e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="meterReader">Meter reader</Label>
            <SearchableAddSelect
              id="meterReader"
              value={form.meterReader}
              options={readers}
              placeholder="Select meter reader"
              required
              onChange={(value) => update("meterReader", value)}
              onAddOption={async (name) => {
                await addLookup("meter_reader", name);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sepMeterReader">SEP meter reader</Label>
            <SearchableAddSelect
              id="sepMeterReader"
              value={form.sepMeterReader}
              options={sepReaders}
              placeholder="Select SEP meter reader"
              onChange={(value) => update("sepMeterReader", value)}
              onAddOption={async (name) => {
                await addLookup("sep_meter_reader", name);
              }}
            />
          </div>

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
              type="date"
              value={form.dateReceived}
              onChange={(e) => update("dateReceived", e.target.value)}
            />
          </Field>

          <div className="space-y-3 rounded-xl border border-[#eef3f6] bg-[#f7fafc] p-4 sm:col-span-2">
            <p className="text-sm font-semibold text-[#006699]">Header Address</p>
            <div className="space-y-2">
              <Label htmlFor="municipality">Municipalities / City</Label>
              <div className="relative">
                <MapPinIcon className="pointer-events-none absolute top-3 left-3 z-10 size-4 text-[#0099cc]" />
                <div className="pl-9">
                  <SearchableAddSelect
                    id="municipality"
                    value={form.address}
                    options={municipalities}
                    placeholder="Select municipality / city"
                    required
                    onChange={(value) => update("address", value)}
                    onAddOption={async (name) => {
                      await addLookup("address", name);
                    }}
                  />
                </div>
              </div>
            </div>
            <Field label="Home Address" htmlFor="homeAddress">
              <Input
                id="homeAddress"
                value={form.homeAddress}
                onChange={(e) => update("homeAddress", e.target.value)}
                placeholder="House / building / lot"
              />
            </Field>
            <Field label="Brgy" htmlFor="barangay">
              <Input
                id="barangay"
                value={form.barangay}
                onChange={(e) =>
                  update("barangay", firstCapitalRestLower(e.target.value))
                }
                placeholder="Barangay"
              />
              <p className="text-xs text-[#6b7c89]">
                First letter capital, rest lowercase
              </p>
            </Field>
            <Field label="St. / Blk / Sitio / Purok" htmlFor="streetBlock">
              <Input
                id="streetBlock"
                value={form.streetBlock}
                onChange={(e) => update("streetBlock", e.target.value)}
              />
            </Field>
            <div className="space-y-2">
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
