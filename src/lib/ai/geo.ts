import type { RetrievedPoi } from "./poiRetrieval";

// Coordinate validation for AI-generated activities.
//
// The model sometimes invents coordinates, drifts a few km, or places a spot
// in the wrong city. Before returning results we:
//   1. Snap to the verified POI coordinates when the title matches a POI.
//   2. Keep coordinates that are within MAX_DISTANCE_KM of the destination.
//   3. Re-geocode the rest by name via LocationIQ (if a key is configured).
//   4. Anything still unresolved gets 0,0 — the frontend treats 0,0 as
//      "no coordinates" and leaves it off the map.

const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY;

// Generous enough for common day trips (Versailles, Nara, Sounion), tight
// enough to catch a pin in the wrong city or country.
const MAX_DISTANCE_KM = 100;
// LocationIQ free tier allows 2 requests/second; cap lookups per request so
// a badly hallucinated itinerary can't add more than a few seconds.
const MAX_GEOCODE_LOOKUPS = 12;
const GEOCODE_INTERVAL_MS = 550;

interface Point {
  lat: number;
  lon: number;
}

export interface GeoActivity {
  title: string;
  latitude?: number;
  longitude?: number;
}

export interface ValidationStats {
  kept: number;
  snappedToPoi: number;
  geocoded: number;
  cleared: number;
}

function haversineKm(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function toPoint(lat: unknown, lon: unknown): Point | null {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (lat === 0 && lon === 0) return null;
  return { lat, lon };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Median (not mean) so a single bad point can't drag the center away.
function medianPoint(points: Point[]): Point {
  return { lat: median(points.map((p) => p.lat)), lon: median(points.map((p) => p.lon)) };
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

// Module-level cache — survives across requests in the same server process
const geocodeCache = new Map<string, Point | null>();
// Next free request slot. Reserved synchronously, so concurrent requests
// each get their own slot instead of firing at the same moment.
let nextGeocodeSlot = 0;

async function geocode(query: string): Promise<Point | null> {
  if (!LOCATIONIQ_API_KEY) return null;
  const key = query.toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  const now = Date.now();
  const slot = Math.max(now, nextGeocodeSlot);
  nextGeocodeSlot = slot + GEOCODE_INTERVAL_MS;
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));

  try {
    const res = await fetch(
      `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}` +
        `&q=${encodeURIComponent(query)}&format=json&limit=1`,
    );
    // 404 = no match. Cache it so we don't ask again.
    if (res.status === 404) {
      geocodeCache.set(key, null);
      return null;
    }
    if (!res.ok) {
      console.warn(`LocationIQ geocode failed (${res.status}) for "${query}"`);
      return null; // transient — don't cache
    }
    const data = await res.json();
    const point = toPoint(parseFloat(data?.[0]?.lat), parseFloat(data?.[0]?.lon));
    geocodeCache.set(key, point);
    return point;
  } catch (err) {
    console.warn(`LocationIQ geocode error for "${query}":`, err);
    return null;
  }
}

/**
 * Best guess at the destination's center:
 * verified POIs → geocoded destination name → median of the model's own
 * coordinates (only with enough points to outvote a few bad ones).
 */
async function findCenter(
  destination: string,
  pois: RetrievedPoi[],
  activities: GeoActivity[],
): Promise<Point | null> {
  const poiPoints = pois
    .map((p) => toPoint(p.latitude, p.longitude))
    .filter((p): p is Point => p !== null);
  if (poiPoints.length > 0) return medianPoint(poiPoints);

  const geocoded = await geocode(destination);
  if (geocoded) return geocoded;

  const activityPoints = activities
    .map((a) => toPoint(a.latitude, a.longitude))
    .filter((p): p is Point => p !== null);
  if (activityPoints.length >= 5) return medianPoint(activityPoints);

  return null;
}

/**
 * Validates and fixes activity coordinates in place.
 * `referenceActivities` (e.g. the existing itinerary when modifying) only
 * help locate the destination center; they are not modified.
 */
export async function validateCoordinates(
  activities: GeoActivity[],
  destination: string,
  pois: RetrievedPoi[],
  referenceActivities: GeoActivity[] = [],
): Promise<ValidationStats> {
  const stats: ValidationStats = { kept: 0, snappedToPoi: 0, geocoded: 0, cleared: 0 };
  if (activities.length === 0) return stats;

  const center = await findCenter(destination, pois, [...referenceActivities, ...activities]);
  const isNearDestination = (p: Point) =>
    center === null || haversineKm(center, p) <= MAX_DISTANCE_KM;

  const poiByName = new Map(pois.map((p) => [normalizeName(p.name), p]));
  const needsLookup: GeoActivity[] = [];

  for (const activity of activities) {
    const poi = poiByName.get(normalizeName(activity.title));
    if (poi) {
      activity.latitude = poi.latitude;
      activity.longitude = poi.longitude;
      stats.snappedToPoi++;
      continue;
    }
    const point = toPoint(activity.latitude, activity.longitude);
    if (point && isNearDestination(point)) {
      stats.kept++;
    } else {
      needsLookup.push(activity);
    }
  }

  // Sequential on purpose — respects the LocationIQ rate limit.
  for (const [i, activity] of needsLookup.entries()) {
    const found =
      i < MAX_GEOCODE_LOOKUPS ? await geocode(`${activity.title}, ${destination}`) : null;
    if (found && isNearDestination(found)) {
      activity.latitude = found.lat;
      activity.longitude = found.lon;
      stats.geocoded++;
    } else {
      activity.latitude = 0;
      activity.longitude = 0;
      stats.cleared++;
    }
  }

  return stats;
}
