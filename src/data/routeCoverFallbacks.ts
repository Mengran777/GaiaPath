// Backup cover photos for route cards, one set per route theme. Used only when
// the Unsplash search for a route's cover finds nothing (or the API limit is
// reached), so the three routes still get three distinct, on-theme photos.
//
// Same shape as the destination gallery photos (see galleryDestinations.ts).
// Add Unsplash photos here; empty sets simply fall through to the next step.
import type { GalleryPhoto } from "./galleryDestinations";

export type RouteTheme = "classic" | "culture" | "nature";

export const ROUTE_COVER_FALLBACKS: Record<RouteTheme, GalleryPhoto[]> = {
  classic: [],
  culture: [],
  nature: [],
};

/** Which fallback set a route's badge belongs to */
export function routeThemeOf(badge: string): RouteTheme {
  const b = badge.toLowerCase();
  if (b.includes("culinar") || b.includes("food") || b.includes("cultur")) return "culture";
  if (b.includes("nature") || b.includes("hidden")) return "nature";
  return "classic";
}
