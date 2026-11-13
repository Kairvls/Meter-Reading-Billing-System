"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  id?: string;
  value: string;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  addLabel?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
  onAddOption?: (name: string) => Promise<void> | void;
};

export function SearchableAddSelect({
  id,
  value,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search items...",
  addLabel = "ADD NEW ITEM",
  disabled,
  required,
  onChange,
  onAddOption,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => item.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
        setNewName("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function handleAdd() {
    const name = newName.trim();
    if (!name || !onAddOption) return;
    setAdding(true);
    try {
      await onAddOption(name);
      onChange(name);
      setNewName("");
      setQuery("");
      setOpen(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className="border-input bg-background flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-[#0099cc]/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? "text-[#0f3a52]" : "text-[#8aa0ad]"}>
          {value || placeholder}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-[#8aa0ad]" />
      </button>
      {/* keep native required validation via hidden input */}
      <input
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={value}
        required={required}
        onChange={() => undefined}
      />

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-[#dbe7ee] bg-white shadow-[0_12px_40px_rgba(15,58,82,0.12)]">
          <div className="border-b border-[#eef3f6] p-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 text-sm"
            />
          </div>
          <ul
            role="listbox"
            className="max-h-48 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-[#8aa0ad]">No matches</li>
            ) : (
              filtered.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={item === value}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#e8f7fc] ${
                      item === value
                        ? "bg-[#f3f8fc] font-medium text-[#006699]"
                        : "text-[#0f3a52]"
                    }`}
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))
            )}
          </ul>
          {onAddOption ? (
            <div className="border-t border-[#eef3f6] bg-[#f7fafc] p-2">
              <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-[#8aa0ad]">
                {addLabel}
              </p>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New item name"
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAdd();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 bg-[#0099cc] text-white hover:bg-[#0086b3]"
                  disabled={adding || !newName.trim()}
                  onClick={() => void handleAdd()}
                >
                  {adding ? "…" : "Add"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
