"use client";

import { useEffect } from "react";
import Link from "next/link";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    console.error("App error boundary triggered", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-20">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: 'url("/CareerCityPromotionalMaterial.jpg")',
          filter: "blur(8px)",
        }}
      />
      <div className="absolute inset-0 bg-white/85 backdrop-blur-xl" />

      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6 rounded-3xl border border-white/30 bg-white/80 p-12 text-center shadow-2xl">
        <span className="inline-flex items-center rounded-full bg-secondary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
          Issue detected
        </span>
        <h1 className="text-3xl font-bold text-text md:text-4xl">Something disrupted your journey</h1>
        <p className="text-base text-text/70 md:text-lg">
          We hit a snag while loading this view. You can retry, head back to the welcome portal, or reach out if the
          problem keeps appearing.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-secondary/90"
          >
            Try again
          </button>
          <Link
            href="/welcome"
            className="inline-flex items-center gap-2 rounded-full border border-secondary/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-secondary transition hover:border-secondary/40 hover:text-secondary/80"
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
    </main>
  );
}
