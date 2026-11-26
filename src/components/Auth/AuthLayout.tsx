"use client";

import React, { useEffect, useState } from "react";
import Logo from "@/components/UI/Logo";
import UnsplashCredit from "@/components/UI/UnsplashCredit";
import { GALLERY_DESTINATIONS, galleryImageUrl, type GalleryDestination, type GalleryPhoto } from "@/data/galleryDestinations";
import { withUtm } from "@/lib/unsplash";

// One full-height destination photo beside the form; a different place each visit.
function PhotoPanel() {
  const [pick, setPick] = useState<{ place: GalleryDestination; photo: GalleryPhoto } | null>(null);

  useEffect(() => {
    const place = GALLERY_DESTINATIONS[Math.floor(Math.random() * GALLERY_DESTINATIONS.length)];
    const photo = place.photos[Math.floor(Math.random() * place.photos.length)];
    setPick({ place, photo });
    fetch("/api/unsplash/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
    }).catch(() => {});
  }, []);

  return (
    <aside className="hidden lg:block relative lg:w-[52%] bg-surface-dim overflow-hidden">
      {pick && (
        <>
          <img
            src={galleryImageUrl(pick.photo, 1200, 1600)}
            alt={`${pick.place.city}, ${pick.place.country}`}
            className="absolute inset-0 w-full h-full object-cover animate-card-enter"
          />
          <div className="absolute inset-x-0 bottom-0 p-10 flex items-end justify-between gap-6 bg-gradient-to-t from-black/35 to-transparent">
            <p className="text-[11px] tracking-[0.08em] uppercase text-white">
              {pick.place.city}, {pick.place.country}
            </p>
            <UnsplashCredit
              photographerName={pick.photo.photographerName}
              photographerUrl={withUtm(pick.photo.photographerProfile)}
            />
          </div>
        </>
      )}
    </aside>
  );
}

/** Split layout shared by the login and register pages: photo left, form right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white">
      <PhotoPanel />
      <main className="flex-1 flex flex-col justify-between px-6 sm:px-14 py-10 min-w-0">
        <Logo />
        <div className="w-full max-w-sm mx-auto my-12">{children}</div>
        <p className="text-xs text-ink-muted">© {new Date().getFullYear()} Gaia</p>
      </main>
    </div>
  );
}
