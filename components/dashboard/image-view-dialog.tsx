"use client";

import { useEffect, useState } from "react";
import {
  Maximize2Icon,
  Minimize2Icon,
  ZoomInIcon,
  ZoomOutIcon,
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
import { formatCoordinate } from "@/lib/image-utils";
import type { MeterRecord } from "@/lib/types";

type Props = {
  open: boolean;
  record: MeterRecord | null;
  onOpenChange: (open: boolean) => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export function ImageViewDialog({ open, record, onOpenChange }: Props) {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setFullscreen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(1))));
  }

  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(1))));
  }

  const meta = record
    ? [
        formatCoordinate(record.latitude, "lat"),
        formatCoordinate(record.longitude, "long"),
      ]
        .filter(Boolean)
        .join("  ")
    : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-[#e6eef3] bg-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#0f3a52]">Reference image</DialogTitle>
            <DialogDescription className="text-[15px] text-[#6b7c89]">
              {record
                ? `${record.accountNumber} · ${record.accountName}`
                : "No record selected"}
            </DialogDescription>
          </DialogHeader>

          {record?.imageUrl ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#cfe6f2] text-[#006699]"
                  onClick={zoomOut}
                  disabled={zoom <= MIN_ZOOM}
                >
                  <ZoomOutIcon />
                  Zoom out
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#cfe6f2] text-[#006699]"
                  onClick={zoomIn}
                  disabled={zoom >= MAX_ZOOM}
                >
                  <ZoomInIcon />
                  Zoom in
                </Button>
                <span className="text-sm tabular-nums text-[#6b7c89]">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto bg-[#0099cc] text-white hover:bg-[#0086b3]"
                  onClick={() => {
                    setZoom(1);
                    setFullscreen(true);
                  }}
                >
                  <Maximize2Icon />
                  Fullscreen
                </Button>
              </div>

              <div className="max-h-[55vh] overflow-auto rounded-xl border border-[#eef3f6] bg-[#f7fafc]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={record.imageUrl}
                  alt={`Reference for ${record.accountNumber}`}
                  className="mx-auto origin-top transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom})`,
                    maxWidth: zoom === 1 ? "100%" : "none",
                    width: zoom === 1 ? "100%" : undefined,
                  }}
                />
              </div>

              {(record.latitude || record.longitude || record.landmark) && (
                <div className="rounded-xl bg-[#f3f8fc] px-4 py-3 text-sm text-[#4d6270]">
                  {record.landmark ? (
                    <p className="font-medium text-[#0f3a52]">{record.landmark}</p>
                  ) : null}
                  {meta ? <p>{meta}</p> : null}
                </div>
              )}
            </div>
          ) : (
            <p className="py-10 text-center text-[15px] text-[#6b7c89]">
              No reference image attached to this record.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {fullscreen && record?.imageUrl ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
            <p className="mr-auto truncate text-sm text-white/90">
              {record.accountNumber} · {record.accountName}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
            >
              <ZoomOutIcon />
            </Button>
            <span className="min-w-12 text-center text-sm tabular-nums text-white/80">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
            >
              <ZoomInIcon />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              onClick={() => setFullscreen(false)}
            >
              <Minimize2Icon />
              Exit
            </Button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.imageUrl}
              alt={`Reference for ${record.accountNumber}`}
              className="max-h-none max-w-none origin-center transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
          {meta || record.landmark ? (
            <div className="border-t border-white/10 px-4 py-3 text-center text-sm text-white/80">
              {record.landmark ? <span>{record.landmark} · </span> : null}
              {meta}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
