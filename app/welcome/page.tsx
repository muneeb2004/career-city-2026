import type { Metadata } from "next";
import WelcomePageClient from "./WelcomePageClient";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Choose the Career City 2026 experience tailored to corporate partners or Habib University staff.",
  alternates: {
    canonical: "/welcome",
  },
};

export default function WelcomePage() {
  return <WelcomePageClient />;
}
