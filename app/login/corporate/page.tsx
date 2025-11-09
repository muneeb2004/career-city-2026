"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function CorporateLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard/corporate";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          toast.error(data.error ?? "Unable to log in. Check your credentials.");
          return;
        }

        toast.success("Welcome back to Career City!");
        router.push(redirect);
      } catch (error) {
        console.error("Corporate login error", error);
        toast.error("Unexpected error during login. Please try again.");
      }
    });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: 'url("/CareerCityPromotionalMaterial.jpg")',
          filter: "blur(8px)",
        }}
      />
      <div className="absolute inset-0 bg-white/85 backdrop-blur-xl" />

      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex w-full max-w-lg flex-col gap-8 rounded-3xl bg-white/90 p-10 text-left shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-text">Corporate Client Login</h1>
            <p className="text-sm text-text/70">
              Access partner tools, manage your stall, and view live engagement stats.
            </p>
          </div>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-text">
            Email
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-primary/30 bg-white px-4 py-3 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="you@organization.com"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-text">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-2xl border border-primary/30 bg-white px-4 py-3 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Enter your password"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition duration-300 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing In
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-sm text-text/70">
          Part of the organizing team?&nbsp;
          <Link
            href="/login/staff"
            className="font-semibold text-primary transition hover:text-primary/90"
          >
            Switch to staff login
          </Link>
          .
        </p>
      </motion.section>
    </main>
  );
}
