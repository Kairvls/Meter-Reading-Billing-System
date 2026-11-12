"use client";

import { FormEvent, useEffect, useState } from "react";
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
import { PasswordInput } from "@/components/ui/password-input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileDialog({ open, onOpenChange }: Props) {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load profile");
        }
        setUsername(data.user.username as string);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load profile"
        );
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, onOpenChange]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          currentPassword,
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update profile");
      }
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-[#e6eef3] bg-white p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#0f3a52]">
            Profile settings
          </DialogTitle>
          <DialogDescription className="text-base text-[#6b7c89]">
            Update your admin username and password. Confirm the new password
            before saving.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-1.5">
            <Label
              htmlFor="profile-username"
              className="text-[15px] text-[#0f3a52]"
            >
              Username
            </Label>
            <Input
              id="profile-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading || saving}
              autoComplete="username"
              required
              className="h-11 px-3 text-[16px] md:text-[16px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="profile-current-password"
              className="text-[15px] text-[#0f3a52]"
            >
              Current password
            </Label>
            <PasswordInput
              id="profile-current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading || saving}
              autoComplete="current-password"
              required
              className="h-11 px-3 text-[16px] md:text-[16px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="profile-password"
              className="text-[15px] text-[#0f3a52]"
            >
              New password
            </Label>
            <PasswordInput
              id="profile-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || saving}
              autoComplete="new-password"
              minLength={6}
              required
              className="h-11 px-3 text-[16px] md:text-[16px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="profile-confirm-password"
              className="text-[15px] text-[#0f3a52]"
            >
              Confirm password
            </Label>
            <PasswordInput
              id="profile-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || saving}
              autoComplete="new-password"
              minLength={6}
              required
              className="h-11 px-3 text-[16px] md:text-[16px]"
            />
          </div>

          <DialogFooter className="-mx-5 -mb-5 border-[#eef3f6] bg-[#f7fafc]">
            <Button
              type="button"
              variant="outline"
              className="border-[#cfe6f2] text-[15px] text-[#006699]"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#0099cc] text-[15px] text-white hover:bg-[#0086b3]"
              disabled={loading || saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
