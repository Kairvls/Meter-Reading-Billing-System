"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeyecoLogo } from "@/components/brand/leyeco-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Login failed");
      }
      toast.success("Welcome back");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,#e8f7fc_0%,#ffffff_42%,#fff7cc_100%)]" />
      <div className="pointer-events-none absolute -top-24 right-[-8%] h-80 w-80 rounded-full bg-[#33b5e5]/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-18%] left-[-8%] h-96 w-96 rounded-full bg-[#ffcc00]/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#0099cc_0%,#33b5e5_45%,#ffcc00_100%)]" />

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md space-y-6 rounded-2xl border border-[#bfe4f3] bg-white/90 p-8 shadow-[0_24px_70px_rgba(0,102,153,0.12)] backdrop-blur"
      >
        <div className="flex flex-col items-center space-y-3 text-center">
          <LeyecoLogo size={112} priority className="drop-shadow-sm" />
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#0099cc] uppercase">
              LEYECO V
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#006699] sm:text-3xl">
              Meter Reading & Billing
            </h1>
            <p className="text-sm text-[#4d6f84]">
              Admin sign-in for defective meter records
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#0099cc] text-white hover:bg-[#0077a8]"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
