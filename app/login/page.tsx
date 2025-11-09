"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, GraduationCap } from "lucide-react";

const options = [
  {
    id: "corporate",
    title: "Corporate Client",
    description: "Log in to manage your stall presence, team roster, and student visit analytics.",
    href: "/login/corporate",
    icon: Building2,
    bg: "bg-gradient-to-br from-primary to-primary/80",
  },
  {
    id: "staff",
    title: "Habib University Staff",
    description: "Log in to coordinate the fair, monitor partner activations, and guide student experiences.",
    href: "/login/staff",
    icon: GraduationCap,
    bg: "bg-gradient-to-br from-secondary to-secondary/70",
  },
] as const;

export default function LoginLanding() {
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
        className="relative z-10 flex w-full max-w-4xl flex-col gap-12 text-center"
      >
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-text md:text-5xl">Select a Portal</h1>
          <p className="text-base text-text/70 md:text-lg">
            Choose the login experience that aligns with your role in Career City 2026.
          </p>
        </div>

        <div className="grid w-full gap-6 md:grid-cols-2">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1, ease: "easeOut" }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={option.href}
                  className={`group flex h-full flex-col justify-between rounded-3xl p-8 text-left text-white shadow-xl ${option.bg}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="rounded-2xl bg-white/15 p-4">
                      <Icon className="h-10 w-10" />
                    </span>
                    <span>
                      <h2 className="text-2xl font-semibold md:text-3xl">{option.title}</h2>
                      <p className="mt-2 text-sm text-white/80 md:text-base">{option.description}</p>
                    </span>
                  </div>

                  <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/90 group-hover:text-white">
                    Continue
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="h-5 w-5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </main>
  );
}
