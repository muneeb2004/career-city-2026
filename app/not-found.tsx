import Link from "next/link";

export default function NotFoundPage() {
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
        <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          404
        </span>
        <h1 className="text-3xl font-bold text-text md:text-5xl">You wandered off the map</h1>
        <p className="text-base text-text/70 md:text-lg">
          The page you tried to reach doesn&apos;t exist in Career City 2026. Double-check the link or return to the
          welcome portal to choose your destination.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/welcome"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-primary/90"
          >
            Back to welcome
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary transition hover:border-primary/40 hover:text-primary/80"
          >
            Landing page
          </Link>
        </div>
      </section>
    </main>
  );
}
