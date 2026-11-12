"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3Icon,
  LayoutDashboardIcon,
  LogOutIcon,
  ScrollTextIcon,
  Trash2Icon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { ProfileDialog } from "@/components/dashboard/profile-dialog";
import { LeyecoLogo } from "@/components/brand/leyeco-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const navItems: {
  href: string;
  label: string;
  match: "exact" | "prefix";
  icon: LucideIcon;
}[] = [
  {
    href: "/dashboard",
    label: "Overview",
    match: "exact",
    icon: LayoutDashboardIcon,
  },
  {
    href: "/dashboard/analytics",
    label: "System Analytics",
    match: "prefix",
    icon: BarChart3Icon,
  },
  {
    href: "/dashboard/logs",
    label: "Records of Logs",
    match: "prefix",
    icon: ScrollTextIcon,
  },
  {
    href: "/dashboard/deleted",
    label: "Deleted Data",
    match: "prefix",
    icon: Trash2Icon,
  },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  }

  return (
    <>
      <div className="h-1.5 bg-[linear-gradient(90deg,#0099cc_0%,#33b5e5_45%,#ffcc00_100%)]" />
      <header className="border-b border-[#cfe6f2] bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <LeyecoLogo size={56} className="shrink-0 rounded-full shadow-sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.18em] text-[#0099cc] uppercase">
                  LEYECO V · Admin Dashboard
                </p>
                <h1 className="truncate text-xl font-semibold tracking-tight text-[#006699] sm:text-2xl">
                  Meter Reading & Billing
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Profile settings"
                className="border-[#0099cc]/30 text-[#006699] hover:bg-[#e8f7fc]"
                onClick={() => setProfileOpen(true)}
              >
                <UserRoundIcon />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#0099cc]/30 text-[#006699] hover:bg-[#e8f7fc]"
                onClick={() => setLogoutOpen(true)}
              >
                <LogOutIcon />
                Logout
              </Button>
            </div>
          </div>

          <nav
            aria-label="Dashboard sections"
            className="flex flex-wrap items-center gap-1 border-t border-[#eef3f6] pt-3"
          >
            {navItems.map((item) => {
              const active = isActive(pathname, item.href, item.match);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[15px] font-medium transition ${
                    active
                      ? "bg-[#0099cc] text-white shadow-sm"
                      : "text-[#4d6f84] hover:bg-[#e8f7fc] hover:text-[#006699]"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      <Dialog
        open={logoutOpen}
        onOpenChange={(open) => {
          if (!loggingOut) setLogoutOpen(open);
        }}
      >
        <DialogContent
          className="border border-[#e6eef3] bg-white p-5 sm:max-w-md"
          showCloseButton={!loggingOut}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0f3a52]">
              Log out?
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed text-[#6b7c89]">
              You will be signed out of the admin dashboard and need to log in
              again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-[#eef3f6] bg-[#f7fafc]">
            <Button
              type="button"
              variant="outline"
              className="border-[#cfe6f2] text-[15px] text-[#006699]"
              disabled={loggingOut}
              onClick={() => setLogoutOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#0099cc] text-[15px] text-white hover:bg-[#0086b3]"
              disabled={loggingOut}
              onClick={() => void confirmLogout()}
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
