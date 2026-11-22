"use client";

import React from "react";
import { ArrowRight, Route } from "lucide-react";

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
        <div className="mx-auto mb-5 w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
          <Route size={24} aria-hidden="true" />
        </div>

        <h2 className="font-display text-2xl font-bold text-ink">No routes yet</h2>
        <p className="mt-2 text-sm text-ink-muted leading-relaxed">
          Fill in your trip details and generate. You&apos;ll get three route
          options to compare, each mapped out day by day.
        </p>

        {onBackToInitial && (
          <button
            onClick={onBackToInitial}
            className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-brand-900 text-white text-sm font-medium
                       hover:bg-brand-700 transition-colors"
          >
            Plan a trip
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}

        <div className="mt-12">
          <p className="text-sm font-medium text-ink-soft mb-3">Or start with a popular destination</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DESTINATIONS.map(({ city, country }) => (
              <button
                key={city}
                onClick={() => handleSelectDestination(city)}
                className="rounded-lg border border-line bg-white px-3 py-2.5 text-left
                           hover:border-brand-500 hover:bg-brand-50 transition-colors"
              >
                <span className="block text-sm font-medium text-ink">{city}</span>
                <span className="block text-xs text-ink-muted">{country}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
