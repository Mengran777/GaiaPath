// src/types/itinerary.ts

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
}

export interface Activity {
  title: string;
  description: string;
  time: string;
  rating?: number; // optional
  price?: string; // optional, can be "Free" or a specific amount
  imageUrl?: string; // optional
  imageAttribution?: { photographerName: string; photographerUrl: string } | null; // set only when imageUrl is from Unsplash
  latitude?: number; // latitude of the activity location
  longitude?: number; // longitude of the activity location
}

export interface DayItinerary {
  day: number;
  title: string;
  date: string; // format is usually "YYYY-MM-DD"
  activities: Activity[];
}

