// src/app/api/generate-itinerary/route.ts
import { RouteOption } from "@/types/routes";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { promises as fs } from "fs";
import path from "path";
import { retrievePois, RetrievedPoi } from "@/lib/ai/poiRetrieval";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

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
  excludeUrls: Set<string>,
): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;
  const tryFetch = async (query: string): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      for (const result of data?.results ?? []) {
        const url: string | undefined = result?.urls?.regular;
        if (url && !excludeUrls.has(url)) return url;
      }
      return null;
    } catch {
      return null;
    }
  };
  return (await tryFetch(keywords)) ?? (await tryFetch(keywords + " scenic"));
}

// Module-level cache — survives across requests in the same server process
const unsplashImageCache = new Map<string, string>();

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

async function fetchUnsplashImage(keywords: string): Promise<string | undefined> {
  if (!UNSPLASH_ACCESS_KEY) return undefined;
  if (unsplashImageCache.has(keywords)) return unsplashImageCache.get(keywords);
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } },
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const url: string | undefined = data?.results?.[0]?.urls?.small;
    if (url) unsplashImageCache.set(keywords, url);
    return url;
  } catch {
    return undefined;
  }
}

// Type definitions (consistent with src/app/types/itinerary.ts)
interface Activity {
  title: string;
  description: string;
  time?: string;
  rating?: number;
  price?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

interface DayItinerary {
  day: number;
  title: string;
  date: string;
  activities: Activity[];
}

interface GeneratedItinerary {
  name: string;
  startDate: string;
  endDate: string;
  itineraryDays: DayItinerary[];
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

function formatPoisForPrompt(pois: RetrievedPoi[]): string {
  if (pois.length === 0) {
    return "(No verified local place data available for this destination — use your own knowledge, but still be as accurate as possible with real place names and coordinates.)";
  }
  return pois
    .map((p) => `- ${p.name} [${p.category ?? "general"}] (${p.latitude}, ${p.longitude}): ${p.description}`)
    .join("\n");
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log("Backend received raw request body:", body);

    const {
      destination,
      travelStartDate,
      travelEndDate,
      arrivalTime,
      departureTime,
      // budget,
      travelers,
      travelType,
      transportation,
      activityIntensity,
      specialNeeds,
      userRequest, // ⭐ New: user's custom request
      userId,
    } = body;

    console.log("Backend preferences extracted:");
    console.log("   destination:", destination);
    console.log("   travelStartDate:", travelStartDate);
    console.log("   travelEndDate:", travelEndDate);
    console.log("   arrivalTime:", arrivalTime);
    console.log("   departureTime:", departureTime);
    // console.log("   budget:", budget);
    console.log("   travelers:", travelers);
    console.log("   travelType:", travelType);
    console.log("   transportation:", transportation);
    console.log("   activityIntensity:", activityIntensity);
    console.log("   specialNeeds:", specialNeeds);
    console.log("   userRequest:", userRequest); // ⭐ New log
    console.log("   userId:", userId);

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

    console.log("=== PARALLEL GENERATION STARTED ===");
    console.log("Destination:", destination);
    console.log("Generating 3 routes in parallel with real images...");
    console.log("=== === === === === === === ===");

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

      // Retry function (with exponential backoff)
      const generateWithRetry = async (maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          let responseText = ""; // Defined outside so it's accessible in catch
          try {
            const model = genAI.getGenerativeModel({
              model: "gemini-3.1-flash-lite-preview",
              generationConfig: {
                temperature: 0.7, // Lower = faster, more focused
                maxOutputTokens: 8192, // Further increased to ensure complete JSON
              },
            });

            const result = await model.generateContent(routePrompt);
            responseText = result.response.text();

            console.log(
              `✅ Generated route: ${routeTheme.theme} (attempt ${attempt})`,
            );
            console.log(
              `📝 Response length: ${responseText.length} characters`,
            );

            // Extract JSON
            let jsonString = responseText.trim();
            const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              jsonString = jsonMatch[1].trim();
            }
            if (!jsonString.startsWith("{")) {
              const objectMatch = jsonString.match(/\{[\s\S]*\}/);
              if (objectMatch) {
                jsonString = objectMatch[0];
              }
            }

            // Validate JSON is complete
            if (!jsonString || jsonString.length < 10) {
              throw new Error(
                `JSON string too short or empty: "${jsonString.substring(0, 100)}..."`,
              );
            }

            // Check if JSON ends with } (complete object)
            if (!jsonString.trim().endsWith("}")) {
              console.warn(`⚠️ JSON may be incomplete for ${routeTheme.theme}`);
              console.log(
                `Last 200 chars: ...${responseText.substring(responseText.length - 200)}`,
              );
            }

            return JSON.parse(jsonString);
          } catch (error: any) {
            const isOverloaded =
              error?.message?.includes("503") ||
              error?.message?.includes("overloaded");
            const isJSONError =
              error?.message?.includes("JSON") || error?.name === "SyntaxError";

            // If JSON error, print more debug info
            if (isJSONError && responseText) {
              console.error(`🔍 JSON Parse Error for ${routeTheme.theme}:`);
              console.log(`First 300 chars: ${responseText.substring(0, 300)}`);
              console.log(
                `Last 300 chars: ...${responseText.substring(Math.max(0, responseText.length - 300))}`,
              );
            }

            // Retry for 503 errors or JSON errors
            if ((isOverloaded || isJSONError) && attempt < maxRetries) {
              const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
              console.log(
                `⏳ Retrying ${routeTheme.theme} in ${waitTime / 1000}s... (attempt ${attempt}/${maxRetries})`,
              );
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            } else {
              console.error(
                `❌ Failed to generate route ${routeTheme.theme} after ${attempt} attempts:`,
                error,
              );
              return null;
            }
          }
        }
        return null;
      };

      return await generateWithRetry();
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

    // Collect activities and normalise coordinates
    type ActivityWithKeywords = { activity: Activity; keywords: string };
    const activityEntries: ActivityWithKeywords[] = [];

    for (const route of generatedItineraryData) {
      if (!route.itinerary || !Array.isArray(route.itinerary)) continue;
      for (const day of route.itinerary) {
        if (!day.activities || !Array.isArray(day.activities)) continue;
        for (const activity of day.activities) {
          activity.latitude =
            typeof activity.latitude === "number" ? activity.latitude : 0;
          activity.longitude =
            typeof activity.longitude === "number" ? activity.longitude : 0;
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

    console.log(
      `📸 Fetching ${uniqueKeywords.length} unique Unsplash activity images ` +
      `(${activityEntries.length} total activities, cache saves the rest)...`,
    );
    await Promise.all(uniqueKeywords.map((kw) => fetchUnsplashImage(kw)));

    // Assign from cache
    for (const { activity, keywords } of activityEntries) {
      const url = unsplashImageCache.get(keywords);
      if (url) activity.imageUrl = url;
    }
    console.log("✅ All Unsplash activity images fetched!");

    // Fetch Unsplash cover images sequentially to allow deduplication
    if (UNSPLASH_ACCESS_KEY) {
      console.log("🖼️ Fetching Unsplash cover images...");
      const usedCoverUrls = new Set<string>();
      for (const route of generatedItineraryData) {
        const keywords = getUnsplashKeywords(route.badge, destination);
        const coverUrl = await fetchUnsplashCover(keywords, usedCoverUrls);
        route.coverImageUrl = coverUrl ?? null;
        if (coverUrl) usedCoverUrls.add(coverUrl);
      }
      console.log("✅ Unsplash cover images fetched!");
    } else {
      console.warn("⚠️ UNSPLASH_ACCESS_KEY not set — skipping cover images");
      for (const route of generatedItineraryData) route.coverImageUrl = null;
    }

    // ============ Temporarily commented out database saving ============
    // Reason: now returning multiple routes, save after user selects
    /*
    // 4. Save AI-generated itinerary to the database
    const tripName = generatedItineraryData.name;

    // Parse date/time - handle possible format issues
    let tripStartDate: Date;
    let tripEndDate: Date;

    try {
      // Try to parse the date returned by AI
      tripStartDate = new Date(generatedItineraryData.startDate);
      tripEndDate = new Date(generatedItineraryData.endDate);

      // If parsing fails, use user-input dates
      if (isNaN(tripStartDate.getTime())) {
        console.warn("AI returned invalid start date, using user input");
        tripStartDate = new Date(travelStartDate);
      }

      if (isNaN(tripEndDate.getTime())) {
        console.warn("AI returned invalid end date, using user input");
        tripEndDate = new Date(travelEndDate);
      }

      console.log("Parsed trip dates:");
      console.log("  Start:", tripStartDate.toISOString());
      console.log("  End:", tripEndDate.toISOString());
    } catch (dateError) {
      console.error("Error parsing trip dates:", dateError);
      // Fall back to user-input dates
      tripStartDate = new Date(travelStartDate);
      tripEndDate = new Date(travelEndDate);
    }

    const newTrip = await prisma.trip.create({
      data: {
        name: tripName,
        startDate: tripStartDate,
        endDate: tripEndDate,
        userId: authResult.userId,
        locations: {
          create: generatedItineraryData.itineraryDays.flatMap(
            (day: DayItinerary) =>
              day.activities.map((activity: Activity, index: number) => ({
                name: activity.title,
                description: activity.description,
                latitude: activity.latitude || 0,
                longitude: activity.longitude || 0,
                order: day.day * 1000 + index,
                time: activity.time || "",
                rating: activity.rating || 0,
                price: activity.price || "",
                imageUrl: activity.imageUrl || null,
              }))
          ),
        },
      },
      include: {
        locations: true,
      },
    });
    */
    // ============ Database saving end ============

    // 5. Return AI-generated routes to the frontend
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
