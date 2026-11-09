// src/types/routes.ts

import { DayItinerary } from "./itinerary";

/**
 * A single label/highlight for a route option
 */
export interface RouteHighlight {
  label: string;
  icon?: string;
}

/**
 * A single route option
 */
export interface RouteOption {
  id: string;
  badge: string; // e.g., "🏛️ Classic Route"
  badgeColor?: string; // e.g., "#667eea"
  title: string;
  description: string;
  highlights: RouteHighlight[];
  days: number;
  estimatedBudget?: string;
  intensity?: "easy" | "moderate" | "high";
  itinerary: DayItinerary[]; // Full itinerary data
  coverImageUrl?: string | null; // Unsplash cover image for RouteCard
  coverImageAttribution?: { photographerName: string; photographerUrl: string } | null;
}

