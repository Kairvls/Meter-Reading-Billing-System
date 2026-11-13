"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LookupItem, LookupKind } from "@/lib/lookups";

type Props = {
  kind: LookupKind;
  title: string;
  description: string;
};

function parseNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    for (const part of line.split(/[,;\t]/)) {
      const name = part.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
  }

  return names;
}

export function LookupsMaintenance({ kind, title, description }: Props) {
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pendingNames = parseNames(name);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lookups?kind=${kind}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items as LookupItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    const names = parseNames(name);
    if (names.length === 0) return;

    setSaving(true);
    try {
      let added = 0;
      for (const itemName of names) {
        const res = await fetch("/api/lookups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, name: itemName }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || `Failed to add "${itemName}"`);
        }
        added += 1;
      }
      setName("");
      toast.success(
        added === 1 ? "Added 1 item" : `Added ${added} items`
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/lookups/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpload(file: File) {
    try {
      const text = await file.text();
      const names = text
        .split(/\r?\n/)
        .map((line) => line.split(/[,\t]/)[0]?.trim() || "")
        .filter(Boolean)
        .filter(
          (line) =>
            !/^(name|meter reader|address|reader|municipality|city)$/i.test(
              line
            )
        );

      if (names.length === 0) {
        toast.error("No names found in file");
        return;
      }

      let added = 0;
      for (const itemName of names) {
        const res = await fetch("/api/lookups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, name: itemName }),
        });
        const data = await res.json();
        if (res.ok && data.ok) added += 1;
      }
      toast.success(`Imported ${added} item${added === 1 ? "" : "s"}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-[#e6eef3] bg-white p-5 shadow-[0_8px_30px_rgba(15,58,82,0.05)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0f3a52]">{title}</h2>
            <p className="mt-1 text-[15px] text-[#6b7c89]">{description}</p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="border-[#0099cc]/40 text-[#006699] hover:bg-[#e8f7fc]"
              onClick={() => fileRef.current?.click()}
            >
              <FileUpIcon />
              Upload list
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <label className="block text-sm font-medium text-[#3d5a6c]">
            Add one or more names
          </label>
          <textarea
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={"One name per line (or comma-separated)\n\nAlbuera\nOrmoc City\nKananga"}
            rows={5}
            className="w-full resize-y rounded-xl border border-[#d7e4ec] bg-white px-3.5 py-3 text-[15px] text-[#0f3a52] outline-none placeholder:text-[#9aafbc] focus:border-[#0099cc] focus:ring-2 focus:ring-[#0099cc]/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void handleAdd();
              }
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#6b7c89]">
              Tip: paste a list, then press{" "}
              <kbd className="rounded border border-[#d7e4ec] bg-[#f5f9fb] px-1.5 py-0.5 text-[12px]">
                Ctrl
              </kbd>
              +
              <kbd className="rounded border border-[#d7e4ec] bg-[#f5f9fb] px-1.5 py-0.5 text-[12px]">
                Enter
              </kbd>{" "}
              to add all.
              {pendingNames.length > 0 ? (
                <span className="ml-1 font-medium text-[#006699]">
                  {pendingNames.length} ready
                </span>
              ) : null}
            </p>
            <Button
              type="button"
              className="bg-[#0099cc] text-white hover:bg-[#0086b3] sm:min-w-[120px]"
              disabled={saving || pendingNames.length === 0}
              onClick={() => void handleAdd()}
            >
              <PlusIcon />
              {saving
                ? "Adding..."
                : pendingNames.length > 1
                  ? `Add ${pendingNames.length}`
                  : "Add"}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e6eef3] bg-white shadow-[0_8px_30px_rgba(15,58,82,0.04)]">
        {loading ? (
          <p className="px-5 py-10 text-center text-[15px] text-[#6b7c89]">
            Loading...
          </p>
        ) : items.length === 0 ? (
          <p className="px-5 py-10 text-center text-[15px] text-[#6b7c89]">
            No items yet. Add one or more names, or upload a list (.txt / .csv).
          </p>
        ) : (
          <ul className="divide-y divide-[#eef3f6]">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <span className="min-w-0 truncate text-[15px] font-medium text-[#0f3a52]">
                  {item.name}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  disabled={busyId === item.id}
                  onClick={() => void handleDelete(item.id)}
                >
                  <Trash2Icon />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
