// RootLayout.tsx
// Location: src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter_Tight, Newsreader } from "next/font/google";
import Providers from "@/components/Providers";

// Self-hosted at build time by next/font — no request to Google at runtime.
// Editorial pairing: a newspaper serif for headings, a compact grotesk for UI text.
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Gaia — Journeys, gently planned",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${interTight.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-white text-ink font-sans antialiased">
        <Providers>{children}</Providers>
        {/* Dev-only quick-fill button — file is gitignored, no-ops if absent */}
        {process.env.NODE_ENV === "development" && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script src="/dev-quick-fill.js" async />
        )}
      </body>
    </html>
  );
}
