"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { MeterRecord } from "@/lib/types";

type Props = {
  record: MeterRecord;
  headerClass: string;
  cellClass: string;
  onHover: (event: React.MouseEvent<HTMLTableRowElement>, record: MeterRecord) => void;
};

export function SortableRecordRow({
  record,
  cellClass,
  onHover,
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

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="bg-white transition-colors hover:bg-[#f7fafc]"
      onMouseEnter={(event) => onHover(event, record)}
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
        <TruncatedText text={record.address} />
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
