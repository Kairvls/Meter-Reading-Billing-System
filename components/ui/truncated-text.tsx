"use client";

import { useEffect, useRef, useState } from "react";
import { HoverTooltip } from "@/components/ui/hover-tooltip";

type Props = {
  text: string;
  className?: string;
};

export function TruncatedText({ text, className = "" }: Props) {
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

  if (!text) return null;

  return (
    <HoverTooltip
      content={truncated ? text : ""}
      className="block w-full min-w-0"
    >
      <span
        ref={ref}
        className={`block w-full min-w-0 cursor-default truncate ${className}`}
      >
        {text}
      </span>
    </HoverTooltip>
  );
}
