// src/app/api/generate-itinerary/route.ts
import { RouteOption } from "@/types/routes";
import { Activity } from "@/types/itinerary";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { retrievePois, RetrievedPoi, formatPoisForPrompt } from "@/lib/ai/poiRetrieval";
import { generateJson, routeSchema } from "@/lib/ai/gemini";
import { validateCoordinates } from "@/lib/ai/geo";
import { selectUnsplashPhoto, UnsplashPhoto } from "@/lib/unsplash";

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

async function fetchUnsplashCover(
  keywords: string,
  destination: string,
  excludeUrls: Set<string>,
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
        if (!url) continue;
        if (!allowDuplicate && excludeUrls.has(url)) continue;
        // Only commits (and fires the download-trigger ping) once a candidate
        // actually has usable attribution — otherwise keep trying the rest.
        const photo = selectUnsplashPhoto(result, "regular", UNSPLASH_ACCESS_KEY!);
        if (photo) return photo;
      }
      return null;
    } catch {
      return null;
    }
  };
  // Widen the pool if the badge-keyword bucket is already exhausted by earlier
  // routes, then as a last resort accept a duplicate — a repeated cover beats none.
  return (
    (await tryFetch(keywords)) ??
    (await tryFetch(keywords + " scenic")) ??
    (await tryFetch(destination)) ??
    (await tryFetch(keywords, true))
  );
}

// Module-level cache — survives across requests in the same server process
const unsplashImageCache = new Map<string, UnsplashPhoto>();

const STOPWORDS = new Set([
  "the", "and", "of", "at", "in", "a", "an", "to", "for",
  "by", "on", "with", "from", "visit", "explore", "see", "tour",
]);

function buildActivityKeywords(title: string, destination: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .slice(0, 3);
  return [...words, destination].join(" ");
}

async function fetchUnsplashImage(keywords: string): Promise<UnsplashPhoto | undefined> {
  if (!UNSPLASH_ACCESS_KEY) return undefined;
  if (unsplashImageCache.has(keywords)) return unsplashImageCache.get(keywords);
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } },
    );
    if (!res.ok) {
      console.warn(`Unsplash activity image search failed (${res.status}) for "${keywords}"`);
      return undefined;
    }
    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return undefined;
    const photo = selectUnsplashPhoto(result, "small", UNSPLASH_ACCESS_KEY) ?? undefined;
    if (photo) unsplashImageCache.set(keywords, photo);
    return photo;
  } catch {
    return undefined;
  }
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

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      userId,
    } = body;

    const missingFields = [];
    if (!destination) missingFields.push("destination");
    if (!travelStartDate) missingFields.push("travelStartDate");
    if (!travelEndDate) missingFields.push("travelEndDate");
    if (!userId) missingFields.push("userId");

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

    // ⭐ Fix highlights format ⭐
    generatedItineraryData = generatedItineraryData.map((route) => {
      // If highlights is a string array, convert to object array
      if (route.highlights && route.highlights.length > 0) {
        const firstHighlight = route.highlights[0];
        // Check if it's a string (needs conversion)
        if (typeof firstHighlight === "string") {
          // Add a suitable icon for each highlight
          const iconMap: { [key: string]: string } = {
            museum: "🏛️",
            food: "🍽️",
            nature: "🌳",
            beach: "🏖️",
            mountain: "⛰️",
            shopping: "🛍️",
            art: "🎨",
            history: "📜",
            culture: "🎭",
            adventure: "🎒",
            restaurant: "🍴",
            cafe: "☕",
            park: "🌲",
            church: "⛪",
            castle: "🏰",
            palace: "👑",
            market: "🏪",
            lake: "🌊",
            sunset: "🌅",
            sunrise: "🌄",
          };

          route.highlights = (route.highlights as unknown as string[]).map(
            (highlight: string) => {
              // Try to match keywords to find a suitable icon
              const lowerHighlight = highlight.toLowerCase();
              let icon = "✨"; // Default icon

              for (const [keyword, emoji] of Object.entries(iconMap)) {
                if (lowerHighlight.includes(keyword)) {
                  icon = emoji;
                  break;
                }
              }

              return {
                label: highlight,
                icon: icon,
              };
            },
          );
        }
      }
      return route;
    });

    console.log(
      `✅ Successfully generated ${generatedItineraryData.length} routes in parallel`,
    );

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
            keywords: buildActivityKeywords(activity.title, destination),
          });
        }
      }
    }

    // Deduplicate: only fetch keywords not already in the module-level cache
    const uniqueKeywords = [
      ...new Set(
        activityEntries
          .map((e) => e.keywords)
          .filter((kw) => !unsplashImageCache.has(kw)),
      ),
    ];

    // Coordinate validation runs alongside image fetching — they touch
    // different fields, so neither waits on the other.
    const [coordStats] = await Promise.all([
      validateCoordinates(
        activityEntries.map((e) => e.activity),
        destination,
        retrievedPois,
      ),
      ...uniqueKeywords.map((kw) => fetchUnsplashImage(kw)),
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
    if (UNSPLASH_ACCESS_KEY) {
      const usedCoverUrls = new Set<string>();
      for (const route of generatedItineraryData) {
        const keywords = getUnsplashKeywords(route.badge, destination);
        const cover = await fetchUnsplashCover(keywords, destination, usedCoverUrls);
        route.coverImageUrl = cover?.url ?? null;
        route.coverImageAttribution = cover
          ? { photographerName: cover.photographerName, photographerUrl: cover.photographerUrl }
          : null;
        if (cover) usedCoverUrls.add(cover.url);
      }
    } else {
      console.warn("⚠️ UNSPLASH_ACCESS_KEY not set — skipping cover images");
      for (const route of generatedItineraryData) {
        route.coverImageUrl = null;
        route.coverImageAttribution = null;
      }
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
