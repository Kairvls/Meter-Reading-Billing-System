"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Building2Icon,
  ClipboardListIcon,
  HomeIcon,
  ImageIcon,
  LandmarkIcon,
  MapPinIcon,
  SignpostIcon,
  XIcon,
} from "lucide-react";
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

const fieldInputClass =
  "h-11 rounded-lg border-[#e5eaf0] bg-white px-3 text-[15px] text-[#1f3645] shadow-none placeholder:text-[#9aabba] focus-visible:border-[#0099cc] focus-visible:ring-[#0099cc]/20";

const labelClass = "text-[13px] font-semibold text-[#374151]";

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
        className="max-h-[92vh] gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_24px_80px_rgba(15,58,82,0.18)] ring-1 ring-black/5 sm:max-w-[640px]"
        showCloseButton
      >
        <DialogHeader className="gap-1 border-b border-[#eef2f6] px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5 pr-8">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#e8f7fc] text-[#0099cc]">
              <ClipboardListIcon className="size-4.5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-[#1f3645]">
                {isEdit ? "Edit record" : "Create record"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-[#8aa0ad]">
                Fill in the defective meter details, then save.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(92vh-9.5rem)] overflow-y-auto px-6 py-5"
        >
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="date" required>
              <Input
                id="date"
                type="date"
                className={fieldInputClass}
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                required
              />
            </Field>
            <Field label="Account number" htmlFor="accountNumber" required>
              <Input
                id="accountNumber"
                inputMode="numeric"
                autoComplete="off"
                placeholder="00-0000-0000"
                maxLength={ACCOUNT_NUMBER_MAX_LENGTH}
                className={fieldInputClass}
                value={form.accountNumber}
                onChange={(e) =>
                  update("accountNumber", formatAccountNumber(e.target.value))
                }
                required
              />
              <p className="text-xs text-[#9aabba]">Format: 00-0000-0000</p>
            </Field>

            <Field label="MCO Last name" htmlFor="lastName" required>
              <Input
                id="lastName"
                className={fieldInputClass}
                value={nameParts.lastName}
                onChange={(e) => updateNamePart("lastName", e.target.value)}
                required
              />
            </Field>
            <Field label="MCO First name" htmlFor="firstName" required>
              <Input
                id="firstName"
                className={fieldInputClass}
                value={nameParts.firstName}
                onChange={(e) => updateNamePart("firstName", e.target.value)}
                required
              />
            </Field>
            <Field label="MCO Middle name" htmlFor="middleName">
              <Input
                id="middleName"
                className={fieldInputClass}
                value={nameParts.middleName}
                onChange={(e) => updateNamePart("middleName", e.target.value)}
              />
            </Field>
            <Field label="Meter number" htmlFor="meterNumber" required>
              <Input
                id="meterNumber"
                className={fieldInputClass}
                value={form.meterNumber}
                onChange={(e) => update("meterNumber", e.target.value)}
                required
              />
            </Field>

            <div className="space-y-1.5">
              <Label htmlFor="meterReader" className={labelClass}>
                Meter reader <Req />
              </Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="sepMeterReader" className={labelClass}>
                SEP meter reader
              </Label>
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

            <Field label="Remarks" htmlFor="remarks" required>
              <Input
                id="remarks"
                className={fieldInputClass}
                value={form.remarks}
                onChange={(e) => update("remarks", e.target.value)}
                required
              />
            </Field>
            <Field label="Contact number" htmlFor="contactNumber">
              <Input
                id="contactNumber"
                className={fieldInputClass}
                value={form.contactNumber}
                onChange={(e) => update("contactNumber", e.target.value)}
              />
            </Field>
            <Field label="Date received" htmlFor="dateReceived">
              <Input
                id="dateReceived"
                type="date"
                className={fieldInputClass}
                value={form.dateReceived}
                onChange={(e) => update("dateReceived", e.target.value)}
              />
            </Field>

            <div className="space-y-4 rounded-xl border border-[#eef2f6] bg-[#f8fafc] p-4 sm:col-span-2">
              <p className="text-[13px] font-semibold tracking-wide text-[#6b7c89] uppercase">
                Header Address
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="municipality" className={labelClass}>
                  Municipalities / City <Req />
                </Label>
                <div className="relative">
                  <MapPinIcon className="pointer-events-none absolute top-3.5 left-3 z-10 size-4 text-[#0099cc]" />
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
              <div className="space-y-1.5">
                <Label htmlFor="homeAddress" className={labelClass}>
                  Home Address
                </Label>
                <div className="relative">
                  <HomeIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#0099cc]" />
                  <Input
                    id="homeAddress"
                    className={`${fieldInputClass} pl-9`}
                    value={form.homeAddress}
                    onChange={(e) => update("homeAddress", e.target.value)}
                    placeholder="House / building / lot"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barangay" className={labelClass}>
                  Brgy
                </Label>
                <div className="relative">
                  <Building2Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#0099cc]" />
                  <Input
                    id="barangay"
                    className={`${fieldInputClass} pl-9`}
                    value={form.barangay}
                    onChange={(e) =>
                      update("barangay", firstCapitalRestLower(e.target.value))
                    }
                    placeholder="Barangay"
                  />
                </div>
                <p className="text-xs text-[#9aabba]">
                  First letter capital, rest lowercase
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="streetBlock" className={labelClass}>
                  St. / Blk / Sitio / Purok
                </Label>
                <div className="relative">
                  <SignpostIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#0099cc]" />
                  <Input
                    id="streetBlock"
                    className={`${fieldInputClass} pl-9`}
                    value={form.streetBlock}
                    onChange={(e) => update("streetBlock", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="landmark" className={labelClass}>
                  Landmark
                </Label>
                <div className="relative">
                  <LandmarkIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#0099cc]" />
                  <Input
                    id="landmark"
                    className={`${fieldInputClass} pl-9`}
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
                className={fieldInputClass}
                value={form.latitude}
                onChange={(e) => update("latitude", e.target.value)}
              />
            </Field>
            <Field label="Longitude" htmlFor="longitude">
              <Input
                id="longitude"
                inputMode="decimal"
                placeholder="e.g. 124.579751"
                className={fieldInputClass}
                value={form.longitude}
                onChange={(e) => update("longitude", e.target.value)}
              />
            </Field>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className={labelClass}>Reference image</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleImageChange(e.target.files?.[0])}
              />
              {form.imageUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-[#eef2f6] bg-[#f8fafc]">
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
                      className="border-[#e5eaf0] bg-white/95 text-[#374151]"
                      onClick={() => fileRef.current?.click()}
                      disabled={compressing}
                    >
                      Replace
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="border-[#e5eaf0] bg-white/95 text-[#374151]"
                      onClick={() => update("imageUrl", "")}
                      aria-label="Remove image"
                    >
                      <XIcon />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={compressing}
                  className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d5e3ec] bg-[#fbfdfe] text-[14px] font-medium text-[#6b7c89] transition hover:border-[#0099cc]/50 hover:bg-[#f3faff] hover:text-[#006699] disabled:opacity-60"
                >
                  <ImageIcon className="size-5 text-[#0099cc]" />
                  {compressing ? "Processing..." : "Upload reference photo"}
                </button>
              )}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-6 gap-2 rounded-none border-0 bg-transparent p-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg border-[#e5eaf0] px-4 text-[14px] font-medium text-[#0099cc] hover:bg-[#f3faff]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-lg bg-[#0099cc] px-5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#0086b3]"
              disabled={saving || compressing}
            >
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Req() {
  return <span className="text-[#ef4444]">*</span>;
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required ? (
          <>
            {" "}
            <Req />
          </>
        ) : null}
      </Label>
      {children}
    </div>
  );
}
