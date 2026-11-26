// src/app/api/generate-itinerary/route.ts
import { RouteOption } from "@/types/routes";
import { Activity } from "@/types/itinerary";
import { NextRequest, NextResponse } from "next/server";
import { guestGate } from "@/lib/guestGate";
import { promises as fs } from "fs";
import path from "path";
import { retrievePois, RetrievedPoi, formatPoisForPrompt } from "@/lib/ai/poiRetrieval";
import { generateJson, routeSchema } from "@/lib/ai/gemini";
import { validateCoordinates } from "@/lib/ai/geo";
import { selectUnsplashPhoto, withUtm, UnsplashPhoto } from "@/lib/unsplash";
import { searchStopPhotos } from "@/lib/stopPhotoSearch";
import { ROUTE_COVER_FALLBACKS, routeThemeOf } from "@/data/routeCoverFallbacks";
import { galleryImageUrl } from "@/data/galleryDestinations";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
}

function getUnsplashKeywords(badge: string, destination: string): string {
  const b = badge.toLowerCase();
  if (b.includes("culinar") || b.includes("food") || b.includes("culture")) {
    return `${destination} culture food market`;
  }
  if (b.includes("nature") || b.includes("hidden")) {
    return `${destination} waterfall jungle nature`;
  }
  return `${destination} landmark temple travel`;
}

// Dedupes by Unsplash photo ID, not URL: the same photo comes back with a
// different tracking parameter (ixid) on every search, so URLs never match.
async function fetchUnsplashCover(
  keywords: string,
  destination: string,
  usedPhotoIds: Set<string>,
  allowDuplicate = false,
): Promise<UnsplashPhoto | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;
  const tryFetch = async (query: string, allowDuplicate = false): Promise<UnsplashPhoto | null> => {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } },
      );
      if (!res.ok) {
        console.warn(
          `Unsplash cover search failed (${res.status}) for query "${query}" ` +
          `(rate limit remaining: ${res.headers.get("x-ratelimit-remaining") ?? "n/a"})`,
        );
        return null;
      }
      const data = await res.json();
      for (const result of data?.results ?? []) {
        const url: string | undefined = result?.urls?.regular;
        const id: string | undefined = result?.id;
        if (!url) continue;
        if (!allowDuplicate && id && usedPhotoIds.has(id)) continue;
        // Only commits (and fires the download-trigger ping) once a candidate
        // actually has usable attribution — otherwise keep trying the rest.
        const photo = selectUnsplashPhoto(result, "regular", UNSPLASH_ACCESS_KEY!);
        if (photo) {
          if (id) usedPhotoIds.add(id);
          return photo;
        }
      }
      return null;
    } catch {
      return null;
    }
  };
  // Widen the pool if the badge-keyword bucket is already exhausted by earlier
  // routes, then as a last resort accept a duplicate — a repeated cover beats none.
  if (allowDuplicate) return tryFetch(keywords, true);
  return (
    (await tryFetch(keywords)) ??
    (await tryFetch(keywords + " scenic")) ??
    (await tryFetch(destination))
  );
}

// A backup cover from the route theme's own set (data/routeCoverFallbacks.ts),
// so the three routes stay distinct even when the search finds nothing.
function pickFallbackCover(badge: string, usedPhotoIds: Set<string>): UnsplashPhoto | null {
  const set = ROUTE_COVER_FALLBACKS[routeThemeOf(badge)].filter((p) => !usedPhotoIds.has(p.id));
  if (set.length === 0) return null;
  const photo = set[Math.floor(Math.random() * set.length)];
  usedPhotoIds.add(photo.id);
  if (UNSPLASH_ACCESS_KEY) {
    // Unsplash download ping for a photo we display
    fetch(photo.downloadLocation, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }).catch(() => {});
  }
  return {
    url: galleryImageUrl(photo, 1080, 1350),
    photographerName: photo.photographerName,
    photographerUrl: withUtm(photo.photographerProfile),
  };
}

// Module-level cache — survives across requests in the same server process
const unsplashImageCache = new Map<string, UnsplashPhoto>();

// Cache key for a stop's photo
const stopPhotoKey = (title: string, destination: string) => `${title.toLowerCase()}|${destination.toLowerCase()}`;

// One photo per stop, widening the search when the narrow query finds nothing
// (lib/stopPhotoSearch.ts). Misses are left empty: the page shows a placeholder.
async function fetchStopPhoto(title: string, destination: string): Promise<void> {
  if (!UNSPLASH_ACCESS_KEY) return;
  const key = stopPhotoKey(title, destination);
  if (unsplashImageCache.has(key)) return;
  const [photo] = await searchStopPhotos(title, destination, 1, UNSPLASH_ACCESS_KEY);
  if (photo) unsplashImageCache.set(key, photo);
}

async function getPromptFromFile(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "src", "prompts", filename);
  const fileContent = await fs.readFile(filePath, "utf-8");
  return fileContent;
}

// Preferred POI category per route theme
const THEME_CATEGORY: Record<string, string> = {
  "Classic Route": "classic",
  "Cultural & Culinary": "culture",
  "Nature & Hidden Gems": "nature",
};

const MAX_POIS_PER_PROMPT = 12;

// Same-category candidates first, then the rest as fallback
function selectPoisForTheme(pois: RetrievedPoi[], theme: string): RetrievedPoi[] {
  const preferredCategory = THEME_CATEGORY[theme];
  const primary = pois.filter((p) => p.category === preferredCategory);
  const rest = pois.filter((p) => p.category !== preferredCategory);
  return [...primary, ...rest].slice(0, MAX_POIS_PER_PROMPT);
}

// Three routes in parallel, with model fallback when Gemini is busy, can take
// well over Vercel's default function limit; allow up to a minute.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Guests may generate too, within an hourly allowance
  const { blocked } = await guestGate(request, "generate");
  if (blocked) return blocked;

  try {
    const body = await request.json();

    const {
      destination,
      travelStartDate,
      travelEndDate,
      arrivalTime,
      departureTime,
      travelers,
      travelType,
      transportation,
      activityIntensity,
      specialNeeds,
      userRequest, // free-text request from SmartSearch
    } = body;

    const missingFields = [];
    if (!destination) missingFields.push("destination");
    if (!travelStartDate) missingFields.push("travelStartDate");
    if (!travelEndDate) missingFields.push("travelEndDate");

    if (missingFields.length > 0) {
      console.error(
        "Backend: Missing required fields:",
        missingFields.join(", "),
        "in request body.",
      );
      return NextResponse.json(
        {
          error: `Missing preferences in request body: ${missingFields.join(
            ", ",
          )}`,
        },
        { status: 400 },
      );
    }

    // Retrieve once per request, not per theme — themes split this shared
    // pool by category below. Destinations outside the corpus just get an
    // empty array and the prompt falls back to the model's own knowledge.
    let retrievedPois: RetrievedPoi[] = [];
    try {
      const retrievalQuery = [destination, userRequest].filter(Boolean).join(" — ");
      retrievedPois = await retrievePois(destination, retrievalQuery, 24);
      console.log(`📍 Retrieved ${retrievedPois.length} verified local POIs for grounding`);
    } catch (err) {
      console.error("POI retrieval failed, falling back to model knowledge only:", err);
    }

    // ⭐ Parallel generation strategy: generate 3 curated routes simultaneously ⭐
    const routeThemes = [
      {
        id: crypto.randomUUID(),
        theme: "Classic Route",
        description: "Traditional tourist highlights and must-see attractions",
      },
      {
        id: crypto.randomUUID(),
        theme: "Cultural & Culinary",
        description:
          "Museums, historical sites, local cuisine and food experiences",
      },
      {
        id: crypto.randomUUID(),
        theme: "Nature & Hidden Gems",
        description:
          "Outdoor activities, natural landscapes, and off-the-beaten-path discoveries",
      },
    ];

    // Read single route prompt template
    const singleRouteTemplate = await getPromptFromFile(
      "single_route_prompt.txt",
    );

    // Generate all routes in parallel
    const generateRoutePromises = routeThemes.map(async (routeTheme) => {
      const themedPois = selectPoisForTheme(retrievedPois, routeTheme.theme);
      const routePrompt = singleRouteTemplate
        .replaceAll("{{retrievedPois}}", formatPoisForPrompt(themedPois))
        .replaceAll("{{destination}}", destination || "Flexible")
        .replaceAll("{{travelStartDate}}", travelStartDate || "Flexible")
        .replaceAll("{{travelEndDate}}", travelEndDate || "Flexible")
        .replaceAll("{{arrivalTime}}", arrivalTime || "not specified")
        .replaceAll("{{departureTime}}", departureTime || "not specified")
        .replaceAll("{{travelers}}", travelers || "Flexible")
        .replaceAll(
          "{{travelType}}",
          travelType && travelType.length > 0
            ? travelType.join(", ")
            : "Flexible",
        )
        .replaceAll(
          "{{transportation}}",
          transportation && transportation.length > 0
            ? transportation.join(", ")
            : "Flexible",
        )
        .replaceAll("{{activityIntensity}}", activityIntensity || "Flexible")
        .replaceAll(
          "{{specialNeeds}}",
          specialNeeds && specialNeeds.length > 0
            ? specialNeeds.join(", ")
            : "None",
        )
        .replaceAll(
          "{{userRequest}}",
          userRequest ||
            "I want to have a great travel experience in " +
              (destination || "this location"),
        )
        .replaceAll("{{theme}}", routeTheme.theme)
        .replaceAll("{{themeDescription}}", routeTheme.description)
        .replaceAll("{{routeId}}", routeTheme.id);

      try {
        const route = await generateJson<RouteOption>(routePrompt, {
          schema: routeSchema,
          temperature: 0.7,
          maxOutputTokens: 8192,
          label: routeTheme.theme,
        });
        // The model echoes these from the prompt; enforce them so route ids
        // stay unique (favorites are keyed by id) and badges stay consistent.
        route.id = routeTheme.id;
        route.badge = routeTheme.theme;
        if (!Array.isArray(route.itinerary)) route.itinerary = [];
        console.log(`✅ Generated route: ${routeTheme.theme}`);
        return route;
      } catch (error) {
        console.error(`❌ Failed to generate route ${routeTheme.theme}:`, error);
        return null;
      }
    });

    // Wait for all routes to finish generating
    const generatedRoutes = await Promise.all(generateRoutePromises);

    // Filter out failed routes
    let generatedItineraryData = generatedRoutes.filter(
      (route): route is RouteOption => route !== null,
    );

    // The schema returns highlights as plain strings; the frontend expects { label }
    for (const route of generatedItineraryData) {
      route.highlights = ((route.highlights ?? []) as unknown as string[]).map((label) => ({ label }));
    }

    console.log(
      `✅ Successfully generated ${generatedItineraryData.length} routes in parallel`,
    );

    // Every route failed (usually the AI service is overloaded): say so,
    // instead of returning an empty list the page can't explain
    if (generatedItineraryData.length === 0) {
      return NextResponse.json(
        { error: "Our route planner is busy right now. Give it a minute and try again." },
        { status: 503 },
      );
    }

    // Collect activities (for coordinate validation and image lookup)
    type ActivityWithKeywords = { activity: Activity; keywords: string };
    const activityEntries: ActivityWithKeywords[] = [];

    for (const route of generatedItineraryData) {
      if (!route.itinerary || !Array.isArray(route.itinerary)) continue;
      for (const day of route.itinerary) {
        if (!day.activities || !Array.isArray(day.activities)) continue;
        for (const activity of day.activities) {
          activityEntries.push({
            activity,
            keywords: stopPhotoKey(activity.title, destination),
          });
        }
      }
    }

    // Deduplicate: only fetch keywords not already in the module-level cache
    const uniqueStops = [
      ...new Map(
        activityEntries
          .filter((e) => !unsplashImageCache.has(e.keywords))
          .map((e) => [e.keywords, e.activity.title] as const),
      ).values(),
    ];

    // Coordinate validation runs alongside image fetching — they touch
    // different fields, so neither waits on the other.
    const [coordStats] = await Promise.all([
      validateCoordinates(
        activityEntries.map((e) => e.activity),
        destination,
        retrievedPois,
      ),
      ...uniqueStops.map((title) => fetchStopPhoto(title, destination)),
    ]);
    console.log("📍 Coordinate validation:", coordStats);

    // Assign from cache
    for (const { activity, keywords } of activityEntries) {
      const photo = unsplashImageCache.get(keywords);
      if (photo) {
        activity.imageUrl = photo.url;
        activity.imageAttribution = { photographerName: photo.photographerName, photographerUrl: photo.photographerUrl };
      }
    }

    // Fetch Unsplash cover images sequentially to allow deduplication
    // Cover per route: Unsplash search → the theme's backup set → (last resort)
    // a repeat of an earlier search result → none
    const usedCoverIds = new Set<string>();
    if (!UNSPLASH_ACCESS_KEY) console.warn("⚠️ UNSPLASH_ACCESS_KEY not set — using backup covers only");
    for (const route of generatedItineraryData) {
      const keywords = getUnsplashKeywords(route.badge, destination);
      const cover =
        (await fetchUnsplashCover(keywords, destination, usedCoverIds)) ??
        pickFallbackCover(route.badge, usedCoverIds) ??
        (await fetchUnsplashCover(keywords, destination, usedCoverIds, true));
      route.coverImageUrl = cover?.url ?? null;
      route.coverImageAttribution = cover
        ? { photographerName: cover.photographerName, photographerUrl: cover.photographerUrl }
        : null;
    }

    // Routes are not saved here — only favorites are persisted (see /api/favorites)
    return NextResponse.json(generatedItineraryData, {
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in AI itinerary generation API:", error);
    if (error.message.includes("503 Service Unavailable")) {
      return NextResponse.json(
        {
          error:
            "Internal Server Error during AI generation: The model is overloaded. Please try again later.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 },
    );
  }
}
