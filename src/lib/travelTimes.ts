"use client";

// Travel time between a day's consecutive stops, from the Mapbox Directions API
// (walking and driving profiles; Mapbox has no public-transit routing).
//
//   walk ≤ 20 min          → "12 min walk"            (Mapbox walking, accurate)
//   traveller self-drives  → "15 min drive"           (Mapbox driving, accurate)
//   otherwise              → "about 25 min by transit" (estimate: drive × 1.3 + 8 min)
//   no data                → nothing shown
//
// One request per profile per day (all stops as waypoints), cached per route.
import { useEffect, useState } from "react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const WALK_LIMIT_MIN = 20;

export interface Stop {
  latitude: number;
  longitude: number;
}

export interface Leg {
  /** Midpoint between the two stops, where the label sits on the map */
  at: [number, number];
  label: string;
  minutes: number;
  km: number;
}

export interface DayRoute {
  legs: (Leg | null)[];
  /** Line to draw: walking geometry when available, else straight segments */
  line: [number, number][];
  totalKm: number;
  movingMin: number;
}

type DirLeg = { duration: number; distance: number };
type DirResult = { legs: DirLeg[]; coords: [number, number][] } | null;

const cache = new Map<string, DirResult>();

async function directions(profile: "walking" | "driving", stops: Stop[]): Promise<DirResult> {
  if (!TOKEN || stops.length < 2) return null;
  const path = stops.map((s) => `${s.longitude.toFixed(5)},${s.latitude.toFixed(5)}`).join(";");
  const key = `${profile}|${path}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${path}?geometries=geojson&overview=simplified&access_token=${TOKEN}`
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const route = data?.routes?.[0];
    const result: DirResult = route
      ? { legs: route.legs as DirLeg[], coords: route.geometry?.coordinates ?? [] }
      : null;
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

const round5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);

/** Legs and line for one day's stops (in visiting order). null while loading or for < 2 stops. */
export function useDayRoute(stops: Stop[], selfDrive: boolean): DayRoute | null {
  const [route, setRoute] = useState<DayRoute | null>(null);
  const key = stops.map((s) => `${s.latitude},${s.longitude}`).join(";") + `|${selfDrive}`;

  useEffect(() => {
    let cancelled = false;
    setRoute(null);
    if (stops.length < 2) return;

    (async () => {
      const walk = await directions("walking", stops);
      const needsDrive =
        selfDrive || !walk || walk.legs.some((l) => l.duration / 60 > WALK_LIMIT_MIN);
      const drive = needsDrive ? await directions("driving", stops) : null;
      if (cancelled) return;

      const legs: (Leg | null)[] = stops.slice(1).map((to, i) => {
        const from = stops[i];
        const at: [number, number] = [(from.longitude + to.longitude) / 2, (from.latitude + to.latitude) / 2];
        const w = walk?.legs[i];
        const d = drive?.legs[i];
        if (selfDrive && d) {
          const min = Math.max(1, Math.round(d.duration / 60));
          return { at, label: `${min} min drive`, minutes: min, km: d.distance / 1000 };
        }
        if (w && w.duration / 60 <= WALK_LIMIT_MIN) {
          const min = Math.max(1, Math.round(w.duration / 60));
          return { at, label: `${min} min walk`, minutes: min, km: w.distance / 1000 };
        }
        if (d) {
          const min = round5((d.duration / 60) * 1.3 + 8);
          return { at, label: `about ${min} min by transit`, minutes: min, km: d.distance / 1000 };
        }
        return null;
      });

      const known = legs.filter((l): l is Leg => l !== null);
      setRoute({
        legs,
        line:
          walk && walk.coords.length > 1 && !selfDrive
            ? walk.coords
            : stops.map((s) => [s.longitude, s.latitude] as [number, number]),
        totalKm: known.reduce((sum, l) => sum + l.km, 0),
        movingMin: known.reduce((sum, l) => sum + l.minutes, 0),
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return route;
}
