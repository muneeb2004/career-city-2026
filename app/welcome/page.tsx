"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useAnimation } from "framer-motion";
import { Building2, GraduationCap } from "lucide-react";

const cards = [
  {
    id: "corporate",
    title: "Corporate Client",
    description: "Access tools to manage your stall, team, and student engagement analytics.",
    href: "/login/corporate",
    icon: Building2,
    bg: "bg-gradient-to-br from-primary to-primary/80",
    shadow: "shadow-[0_15px_35px_rgba(59,130,246,0.35)]",
  },
  {
    id: "staff",
    title: "Habib University Staff",
    description: "Coordinate the fair, monitor student visits, and curate partner experiences.",
    href: "/login/staff",
    icon: GraduationCap,
    bg: "bg-gradient-to-br from-secondary to-secondary/70",
    shadow: "shadow-[0_15px_35px_rgba(16,185,129,0.35)]",
  },
] as const;

export default function WelcomePage() {
  const sectionControls = useAnimation();
  const cardControls = useAnimation();

  useEffect(() => {
    void sectionControls.start("visible");
    void cardControls.start("visible");
  }, [sectionControls, cardControls]);

  const sectionVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.2 + index * 0.1,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    }),
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
        initial="hidden"
        animate={sectionControls}
        variants={sectionVariants}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-12 text-center"
      >
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-text md:text-5xl">Choose Your Portal</h1>
          <p className="text-base text-text/70 md:text-lg">
            Select the experience tailored to your role to get started with Career City 2026.
          </p>
        </div>

        <div className="grid w-full gap-6 md:grid-cols-2">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                custom={index}
                initial="hidden"
                animate={cardControls}
                variants={cardVariants}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={card.href}
                  className={`group flex h-full flex-col justify-between rounded-3xl p-8 text-left text-white transition-transform duration-300 ${card.bg} ${card.shadow}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="rounded-2xl bg-white/15 p-4">
                      <Icon className="h-10 w-10" />
                    </span>
                    <span className="text-left">
                      <h2 className="text-2xl font-semibold md:text-3xl">{card.title}</h2>
                      <p className="mt-2 text-sm text-white/80 md:text-base">{card.description}</p>
                    </span>
                  </div>

                  <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/90 group-hover:text-white">
                    Enter
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
