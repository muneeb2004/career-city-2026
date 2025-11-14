"use client";

import { useEffect } from "react";
import Link from "next/link";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error boundary triggered", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: 'url("/CareerCityPromotionalMaterial.jpg")',
            filter: "blur(8px)",
          }}
        />
        <div className="absolute inset-0 bg-white/90 backdrop-blur-xl" />

        <section className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6 rounded-3xl border border-white/30 bg-white/80 p-12 text-center shadow-2xl">
          <span className="inline-flex items-center rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            500
          </span>
          <h1 className="text-3xl font-bold text-text md:text-4xl">We&apos;re recalibrating the city lights</h1>
          <p className="text-base text-text/70 md:text-lg">
            A critical error just occurred. Reload the page or head back to the welcome portal while we stabilise things.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-accent/90"
            >
              Reload page
            </button>
            <Link
              href="/welcome"
              className="inline-flex items-center gap-2 rounded-full border border-accent/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-accent transition hover:border-accent/40 hover:text-accent/80"
            >
              Back to welcome
            </Link>
          </div>
          {error.digest && (
            <p className="text-xs text-text/50" aria-live="polite">
              Error reference: {error.digest}
            </p>
          )}
        </section>
      </body>
    </html>
  );
}
