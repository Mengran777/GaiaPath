import React from "react";
import { MapPin, Map as MapIcon, Star, type LucideIcon } from "lucide-react";
import Logo from "@/components/UI/Logo";

const features: { icon: LucideIcon; text: string }[] = [
  { icon: MapPin, text: "Three route options for every trip" },
  { icon: MapIcon, text: "Every stop pinned on an interactive map" },
  { icon: Star, text: "Save favourites and keep editing them" },
];

function BrandPanel() {
  return (
    <aside className="hidden lg:flex lg:w-[44%] flex-col justify-between bg-brand-950 px-14 py-12">
      <Logo tone="light" />

      <div className="max-w-md">
        <h2 className="font-display text-[2.5rem] font-bold leading-[1.15] text-white">
          Plan your journey,
          <br />
          <em className="italic text-gold-500">effortlessly.</em>
        </h2>
        <p className="mt-5 text-base leading-relaxed text-white/60">
          Tell Gaia where you&apos;re going and what you&apos;re into. You get
          day-by-day routes built around real places, ready to adjust.
        </p>

        <ul className="mt-10 space-y-4">
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-white/75">
              <Icon size={18} className="flex-shrink-0 text-brand-300" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-white/35">© {new Date().getFullYear()} Gaia</p>
    </aside>
  );
}

/** Full-height split layout shared by the login and register pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-surface">
      <BrandPanel />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
