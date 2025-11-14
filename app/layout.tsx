import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getAdminSettings } from "@/lib/settings";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://career-city.habib.edu";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Career City 2026",
    template: "%s · Career City 2026",
  },
  description: "Your gateway to endless career opportunities around Career City 2026.",
  keywords: [
    "Career City",
    "Habib University",
    "Career Fair",
    "Corporate Partners",
    "Student Engagement",
  ],
  authors: [{ name: "Habib University" }],
  creator: "Habib University",
  openGraph: {
    title: "Career City 2026",
    description: "Discover the immersive gateway connecting students with visionary partners.",
    url: SITE_URL,
    siteName: "Career City 2026",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/CareerCityPromotionalMaterial.jpg",
        width: 1200,
        height: 800,
        alt: "Career City 2026 portal preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Career City 2026",
    description: "Experience the immersive career city crafted by Habib University.",
    images: ["/CareerCityPromotionalMaterial.jpg"],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getAdminSettings();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-text`}
      >
        <Providers>
          <GlobalAnnouncement key={settings.updatedAt ?? "v0"} settings={settings} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
