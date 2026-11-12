"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<ComponentProps<typeof Input>, "type">;

function EyeOpenIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* eyelid / brow arc */}
      <path
        d="M2.5 12.5C4.8 8.2 8.2 6 12 6s7.2 2.2 9.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M2.5 12.5C4.8 16.8 8.2 19 12 19s7.2-2.2 9.5-6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12.5" r="3.2" fill="currentColor" />
      <circle cx="12" cy="12.5" r="1.2" fill="white" />
    </svg>
  );
}

function EyeClosedIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2.5 12.5C4.8 8.2 8.2 6 12 6s7.2 2.2 9.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 18.5 20 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.2 15.2a3.2 3.2 0 0 0 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PasswordInput({ className = "", disabled, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={`pr-10 ${className}`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#6b7c89] hover:bg-[#eef6fa] hover:text-[#006699] disabled:pointer-events-none disabled:opacity-50"
        onClick={() => setVisible((prev) => !prev)}
      >
        {visible ? (
          <EyeClosedIcon className="size-[18px]" />
        ) : (
          <EyeOpenIcon className="size-[18px]" />
        )}
      </button>
    </div>
  );
}
