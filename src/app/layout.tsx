// RootLayout.tsx
// Location: src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";

// Self-hosted at build time by next/font — no request to Google at runtime.
// One sans family for body and headings (Notion-like); headings get weight and tighter tracking.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Gaia – Plan your journey, effortlessly",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-brand-950 text-gray-800 font-sans antialiased">
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
