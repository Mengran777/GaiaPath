"use client";

import React from "react";

interface EmptyItineraryStateProps {
  onBackToInitial?: () => void;
  onSelectDestination?: (city: string) => void;
}

// Cities covered by the verified POI corpus (prisma/seed-data/pois), so
// routes generated from these picks are grounded in real place data.
const DESTINATIONS = [
  { city: "Paris", country: "France" },
  { city: "Tokyo", country: "Japan" },
  { city: "Rome", country: "Italy" },
  { city: "Barcelona", country: "Spain" },
  { city: "London", country: "United Kingdom" },
  { city: "New York", country: "United States" },
];

export default function EmptyItineraryState({
  onBackToInitial,
  onSelectDestination,
}: EmptyItineraryStateProps) {
  const handleSelectDestination = (city: string) => {
    onSelectDestination?.(city);
    onBackToInitial?.();
  };

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <p className="eyebrow">Itineraries</p>
        <h2 className="mt-3 font-display text-[44px] leading-[1.04] uppercase text-ink">No routes yet</h2>
        <p className="mt-4 text-sm text-ink-muted leading-relaxed">
          Tell us where and when, and you&apos;ll get three route options to
          compare, each mapped out day by day.
        </p>

        {onBackToInitial && (
          <button type="button" onClick={onBackToInitial} className="btn-ink mt-8">
            Plan a trip
          </button>
        )}

        <div className="mt-14">
          <p className="eyebrow mb-4">Or start with a popular destination</p>
          <div className="flex flex-wrap justify-center gap-1">
            {DESTINATIONS.map(({ city }) => (
              <button key={city} type="button" onClick={() => handleSelectDestination(city)} className="pill-sand text-lg">
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
