// src/app/types/itinerary.ts (or add directly to src/app/types/index.ts)

export interface Activity {
  title: string;
  description: string;
  time: string;
  rating?: number; // optional
  price?: string; // optional, can be "Free" or a specific amount
  imageUrl?: string; // optional
  latitude?: number; // latitude of the activity location
  longitude?: number; // longitude of the activity location
}

export interface DayItinerary {
  day: number;
  title: string;
  date: string; // format is usually "YYYY-MM-DD"
  activities: Activity[];
}

export interface GeneratedItinerary {
  id?: string; // if the backend saves the itinerary and returns an ID
  name: string; // overall itinerary name, e.g., "European Cultural Tour"
  startDate: string; // itinerary start date "YYYY-MM-DD"
  endDate: string; // itinerary end date "YYYY-MM-DD"
  itineraryDays: DayItinerary[];
}
