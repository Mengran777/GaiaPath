// src/app/api/modify-itinerary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { promises as fs } from "fs";
import path from "path";
import { retrievePois, RetrievedPoi, formatPoisForPrompt } from "@/lib/ai/poiRetrieval";
import { Activity, DayItinerary } from "@/types/itinerary";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

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

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
    });

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let jsonString = responseText.trim();
        const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) jsonString = jsonMatch[1].trim();
        if (!jsonString.startsWith("{")) {
          const objectMatch = jsonString.match(/\{[\s\S]*\}/);
          if (objectMatch) jsonString = objectMatch[0];
        }

        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed.operations)) {
          throw new Error("Response JSON is missing an operations array");
        }

        const operations: ModifyOperation[] = parsed.operations.filter(
          (op: any) =>
            (op.type === "replace" || op.type === "add") &&
            typeof op.day === "number" &&
            op.activity,
        );

        return NextResponse.json({
          summary: typeof parsed.summary === "string" ? parsed.summary : "Updated your itinerary.",
          operations,
        });
      } catch (error: any) {
        lastError = error;
        const isOverloaded = error?.message?.includes("503") || error?.message?.includes("overloaded");
        const isJSONError = error?.message?.includes("JSON") || error?.name === "SyntaxError";
        if ((isOverloaded || isJSONError) && attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        break;
      }
    }
    throw lastError;
  } catch (error: any) {
    console.error("Error in modify-itinerary API:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 },
    );
  }
}
