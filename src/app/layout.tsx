// RootLayout.tsx
// Location: src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import Providers from "@/components/Providers";

// Self-hosted at build time by next/font — no request to Google at runtime
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gaia – Plan your journey, effortlessly",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
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
