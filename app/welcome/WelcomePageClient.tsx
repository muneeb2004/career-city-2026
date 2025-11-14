"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
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
    shortcut: "Alt+1",
  },
  {
    id: "staff",
    title: "Habib University Staff",
    description: "Coordinate the fair, monitor student visits, and curate partner experiences.",
    href: "/login/staff",
    icon: GraduationCap,
    bg: "bg-gradient-to-br from-secondary to-secondary/70",
    shadow: "shadow-[0_15px_35px_rgba(16,185,129,0.35)]",
    shortcut: "Alt+2",
  },
] as const;

export default function WelcomePageClient() {
  const sectionControls = useAnimation();
  const cardControls = useAnimation();
  const cardRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    void sectionControls.start("visible");
    void cardControls.start("visible");

    const handleShortcut = (event: KeyboardEvent) => {
      if (!event.altKey) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        cardRefs.current[0]?.focus({ preventScroll: false });
      }

      if (event.key === "2") {
        event.preventDefault();
        cardRefs.current[1]?.focus({ preventScroll: false });
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [sectionControls, cardControls]);

  const sectionVariants = prefersReducedMotion
    ? ({ hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } } as const)
    : ({ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } } as const);

  const cardVariants = prefersReducedMotion
    ? ({ hidden: { opacity: 1, y: 0 }, visible: () => ({ opacity: 1, y: 0 }) } as const)
    : ({
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
      } as const);

  const handleCardListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!cardRefs.current.length) {
      return;
    }

    const activeIndex = cardRefs.current.findIndex((element) => element === document.activeElement);
    if (activeIndex === -1) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (activeIndex + 1) % cardRefs.current.length;
      cardRefs.current[nextIndex]?.focus();
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const previousIndex = (activeIndex - 1 + cardRefs.current.length) % cardRefs.current.length;
      cardRefs.current[previousIndex]?.focus();
    }

    if (event.key === "Home") {
      event.preventDefault();
      cardRefs.current[0]?.focus();
    }

    if (event.key === "End") {
      event.preventDefault();
      cardRefs.current[cardRefs.current.length - 1]?.focus();
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-16"
      aria-labelledby="welcome-heading"
    >
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
          <h1 id="welcome-heading" className="text-3xl font-bold text-text md:text-5xl">
            Choose Your Portal
          </h1>
          <p className="text-base text-text/70 md:text-lg" aria-live="polite">
            Select the experience tailored to your role to get started with Career City 2026. Use Alt+1 or Alt+2 to jump
            directly to a card, or use arrow keys to browse.
          </p>
        </div>

        <div
          role="list"
          aria-label="Available portals"
          className="grid w-full gap-6 md:grid-cols-2"
          onKeyDown={handleCardListKeyDown}
        >
          {cards.map((card, index) => {
            const Icon = card.icon;
            const descriptionId = `${card.id}-description`;
            return (
              <motion.div
                key={card.id}
                role="listitem"
                custom={index}
                initial="hidden"
                animate={cardControls}
                variants={cardVariants}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <Link
                  ref={(element) => {
                    cardRefs.current[index] = element;
                  }}
                  href={card.href}
                  aria-describedby={descriptionId}
                  aria-keyshortcuts={card.shortcut}
                  className={`group flex h-full flex-col justify-between rounded-3xl p-8 text-left text-white transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    card.bg
                  } ${card.shadow} ${prefersReducedMotion ? "" : "hover:scale-105"}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="rounded-2xl bg-white/15 p-4" aria-hidden="true">
                      <Icon className="h-10 w-10" />
                    </span>
                    <span className="text-left">
                      <h2 className="text-2xl font-semibold md:text-3xl">{card.title}</h2>
                      <p id={descriptionId} className="mt-2 text-sm text-white/80 md:text-base">
                        {card.description}
                      </p>
                    </span>
                  </div>

                  <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/90 group-hover:text-white">
                    Enter • Shortcut {card.shortcut}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="h-5 w-5"
                      aria-hidden="true"
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
