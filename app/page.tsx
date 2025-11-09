"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(false);
  const landingControls = useAnimation();
  const fadeUpControls = useAnimation();

  useEffect(() => {
    void landingControls.start("visible");
    void fadeUpControls.start("visible");
  }, [landingControls, fadeUpControls]);

  const landingVariants = {
    hidden: { opacity: 0, scale: 0.95, filter: "blur(0px)" as const },
    visible: { opacity: 1, scale: 1, filter: "blur(0px)" as const },
  };

  const fadeUpVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: 'url("/CareerCityPromotionalMaterial.jpg")',
          filter: "blur(8px)",
        }}
      />
      <div className="absolute inset-0 backdrop-blur-2xl bg-white/80" />

      <AnimatePresence mode="wait" initial={false}>
        {!showWelcome ? (
          <motion.section
            key="landing"
            initial="hidden"
            animate={landingControls}
            variants={landingVariants}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 text-center"
          >
            <motion.h1
              initial="hidden"
              animate={fadeUpControls}
              variants={fadeUpVariants}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-bold text-text md:text-6xl"
            >
              Habib University Career City 2026
            </motion.h1>

            <motion.p
              initial="hidden"
              animate={fadeUpControls}
              variants={fadeUpVariants}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-2xl text-base text-text/70 md:text-lg"
            >
              Discover the immersive gateway designed to connect ambitious students and visionary partners.
            </motion.p>

            <motion.button
              initial="hidden"
              animate={fadeUpControls}
              variants={fadeUpVariants}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ scale: 1.05, boxShadow: "0 15px 35px rgba(59, 130, 246, 0.35)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowWelcome(true)}
              className="rounded-full bg-primary px-10 py-4 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition-colors duration-300 hover:bg-primary/90"
            >
              Enter the City
            </motion.button>
          </motion.section>
        ) : (
          <motion.section
            key="welcome"
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -120, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 flex w-full max-w-4xl flex-col items-start gap-8 rounded-3xl bg-white/80 px-8 py-12 text-left shadow-2xl backdrop-blur-xl md:px-14"
          >
            <motion.h2
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl font-bold text-text md:text-5xl"
            >
              Welcome to the City of Opportunities
            </motion.h2>
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base text-text/70 md:text-lg"
            >
              Navigate interactive floors, explore corporate partnerships, and track student engagements in real time.
            </motion.p>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                Interactive Map
              </span>
              <span className="rounded-full bg-secondary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Real-time Insights
              </span>
              <span className="rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
                Smart Engagement
              </span>
            </motion.div>

            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6"
            >
              <Link
                href="/welcome"
                className="inline-flex items-center gap-3 rounded-full bg-primary px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-transform duration-300 hover:scale-105 hover:bg-primary/90"
              >
                Choose Your Portal
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12l-3.75 3.75" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h17.25" />
                </svg>
              </Link>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
