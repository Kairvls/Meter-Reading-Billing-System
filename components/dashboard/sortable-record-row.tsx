"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  EyeIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatFullAddress } from "@/lib/address-format";
import { formatCoordinate } from "@/lib/image-utils";
import type { MeterRecord } from "@/lib/types";

type Props = {
  record: MeterRecord;
  headerClass: string;
  cellClass: string;
  onViewImage: (record: MeterRecord) => void;
  onView: (record: MeterRecord) => void;
  onEdit: (record: MeterRecord) => void;
  onDelete: (record: MeterRecord) => void;
};

export function SortableRecordRow({
  record,
  cellClass,
  onViewImage,
  onView,
  onEdit,
  onDelete,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    position: "relative",
    zIndex: isDragging ? 20 : undefined,
  };

  const latText = formatCoordinate(record.latitude ?? "", "lat") || "—";
  const longText = formatCoordinate(record.longitude ?? "", "long") || "—";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="bg-white transition-colors hover:bg-[#f7fafc]"
    >
      <td className={`${cellClass} w-10 overflow-hidden`}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="inline-flex cursor-grab items-center justify-center rounded-md p-1 text-[#8aa0ae] hover:bg-[#eef6fa] hover:text-[#006699] active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-[#0099cc]/40 text-[#006699] hover:bg-[#e8f7fc]"
          disabled={!record.imageUrl}
          onClick={(e) => {
            e.stopPropagation();
            onViewImage(record);
          }}
        >
          <EyeIcon />
          Photo
        </Button>
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText text={record.date} />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText
          text={record.accountNumber}
          className="font-semibold text-[#0f3a52]"
        />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText text={record.accountName} className="text-[#0f3a52]" />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText text={record.meterNumber} />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText text={record.meterReader} />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedPill text={record.remarks} />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText text={formatFullAddress(record) || "—"} />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText text={record.landmark || "—"} />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText text={latText} />
      </td>
      <td className={`${cellClass} overflow-hidden`}>
        <TruncatedText text={longText} />
      </td>
      <td className={`${cellClass} overflow-visible`}>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Row actions"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-[#cfe6f2] bg-white text-[#4d6f84] outline-none hover:bg-[#e8f7fc] hover:text-[#006699] focus-visible:ring-2 focus-visible:ring-[#0099cc]/30"
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-[#0f3a52]"
              onClick={() => onView(record)}
            >
              <EyeIcon className="size-4 text-[#0099cc]" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-[#0f3a52]"
              onClick={() => onEdit(record)}
            >
              <PencilIcon className="size-4 text-[#0099cc]" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer gap-2"
              onClick={() => onDelete(record)}
            >
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function TruncatedPill({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setTruncated(el.scrollWidth > el.clientWidth + 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    window.addEventListener("resize", check);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [text]);

  return (
    <HoverTooltip
      content={truncated ? text : ""}
      className="block max-w-full min-w-0"
    >
      <span
        ref={ref}
        className="inline-block max-w-full truncate rounded-full bg-[#e8f7fc] px-2.5 py-0.5 text-[13px] leading-snug font-medium text-[#006699]"
      >
        {text}
      </span>
    </HoverTooltip>
  );
}
