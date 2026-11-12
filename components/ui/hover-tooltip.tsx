"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  content: string;
  children: ReactNode;
  className?: string;
};

type Coord = {
  top: number;
  left: number;
  placement: "top" | "bottom";
};

export function HoverTooltip({ content, children, className = "" }: Props) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coord, setCoord] = useState<Coord | null>(null);
  const [mounted, setMounted] = useState(false);
  const tipId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const update = () => {
      const trigger = triggerRef.current;
      const tip = tipRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const tipWidth = tip?.offsetWidth || 320;
      const tipHeight = tip?.offsetHeight || 40;
      const gap = 10;

      let left = rect.left;
      let top = rect.top - tipHeight - gap;
      let placement: Coord["placement"] = "top";

      if (top < 8) {
        top = rect.bottom + gap;
        placement = "bottom";
      }

      const maxLeft = window.innerWidth - tipWidth - 8;
      left = Math.min(Math.max(8, left), Math.max(8, maxLeft));

      setCoord({ top, left, placement });
    };

    update();
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, content]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`max-w-full min-w-0 ${className || "inline-flex"}`}
        onMouseEnter={() => content && setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => content && setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open && content ? tipId : undefined}
      >
        {children}
      </span>

      {mounted &&
        open &&
        content &&
        createPortal(
          <span
            ref={tipRef}
            id={tipId}
            role="tooltip"
            style={{
              top: coord?.top ?? -9999,
              left: coord?.left ?? -9999,
              visibility: coord ? "visible" : "hidden",
            }}
            className="pointer-events-none fixed z-[100] w-max max-w-[min(360px,calc(100vw-16px))] rounded-lg bg-[#0f3a52] px-3 py-2 text-left text-xs leading-relaxed font-normal whitespace-normal text-white shadow-[0_12px_32px_rgba(15,58,82,0.28)]"
          >
            {content}
            <span
              className={`absolute left-4 h-0 w-0 border-x-[6px] border-x-transparent ${
                coord?.placement === "bottom"
                  ? "bottom-full border-b-[6px] border-b-[#0f3a52]"
                  : "top-full border-t-[6px] border-t-[#0f3a52]"
              }`}
            />
          </span>,
          document.body
        )}
    </>
  );
}
