// src/app/api/modify-itinerary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { retrievePois, RetrievedPoi, formatPoisForPrompt } from "@/lib/ai/poiRetrieval";
import { Activity, DayItinerary } from "@/types/itinerary";
import { generateJson, modifySchema } from "@/lib/ai/gemini";
import { validateCoordinates } from "@/lib/ai/geo";

interface ModifyOperation {
  type: "replace" | "add";
  day: number;
  activityIndex?: number;
  activity: Activity;
}

async function getPromptFromFile(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "src", "prompts", filename);
  return fs.readFile(filePath, "utf-8");
}

// Spells out each activity's day + index explicitly rather than handing the
// model raw JSON — asking an LLM to count array positions in JSON is a
// reliable way to get the wrong index back.
function formatItineraryForPrompt(itinerary: DayItinerary[]): string {
  return itinerary
    .map((day) => {
      const lines = day.activities
        .map((a, i) => `  [${i}] ${a.title} | ${a.time || "no time set"} | lat ${a.latitude}, lon ${a.longitude}`)
        .join("\n");
      return `Day ${day.day} (${day.date}) "${day.title}":\n${lines || "  (no activities)"}`;
    })
    .join("\n\n");
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { destination, currentItinerary, modificationRequest, userId } = body;

    const missingFields = [];
    if (!destination) missingFields.push("destination");
    if (!Array.isArray(currentItinerary)) missingFields.push("currentItinerary");
    if (!modificationRequest) missingFields.push("modificationRequest");
    if (!userId) missingFields.push("userId");
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing fields in request body: ${missingFields.join(", ")}` },
        { status: 400 },
      );
    }

    let retrievedPois: RetrievedPoi[] = [];
    try {
      retrievedPois = await retrievePois(destination, modificationRequest, 15);
    } catch (err) {
      console.error("POI retrieval failed, falling back to model knowledge only:", err);
    }

    const template = await getPromptFromFile("modify_itinerary_prompt.txt");
    const prompt = template
      .replaceAll("{{destination}}", destination)
      .replaceAll("{{modificationRequest}}", modificationRequest)
      .replaceAll("{{currentItinerary}}", formatItineraryForPrompt(currentItinerary))
      .replaceAll("{{retrievedPois}}", formatPoisForPrompt(retrievedPois));

    const parsed = await generateJson<{ summary?: string; operations?: any[] }>(prompt, {
      schema: modifySchema,
      temperature: 0.6,
      maxOutputTokens: 4096,
      label: "modify-itinerary",
    });

    const dayNumbers = new Set(currentItinerary.map((d: DayItinerary) => d.day));
    const operations: ModifyOperation[] = (parsed.operations ?? []).filter(
      (op: any) =>
        (op.type === "replace" || op.type === "add") &&
        dayNumbers.has(op.day) &&
        (op.type === "add" || typeof op.activityIndex === "number") &&
        op.activity,
    );

    // Existing activities only help locate the destination center
    const existingActivities = currentItinerary.flatMap((d: DayItinerary) => d.activities ?? []);
    const coordStats = await validateCoordinates(
      operations.map((op) => op.activity),
      destination,
      retrievedPois,
      existingActivities,
    );
    console.log("📍 Coordinate validation (modify):", coordStats);

    return NextResponse.json({
      summary: typeof parsed.summary === "string" ? parsed.summary : "Updated your itinerary.",
      operations,
    });
  } catch (error: any) {
    console.error("Error in modify-itinerary API:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 },
    );
  }
}
