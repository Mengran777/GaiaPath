// src/app/api/generate-itinerary/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { promises as fs } from "fs";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY; // ⭐ 新增环境变量 ⭐
const GOOGLE_CUSTOM_SEARCH_ENGINE_ID =
  process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID; // ⭐ 新增环境变量 ⭐

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
}
// ⭐ 检查新的环境变量 ⭐
if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
  console.error(
    "GOOGLE_CUSTOM_SEARCH_API_KEY or GOOGLE_CUSTOM_SEARCH_ENGINE_ID is not set."
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// ⭐ 修改这个函数，直接调用 Google Custom Search API ⭐
async function fetchRealImageUrl(query: string): Promise<string | undefined> {
  if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    console.warn(
      "Custom Search API keys not configured. Falling back to placeholder image."
    );
    return `https://placehold.co/400x200/CCCCCC/FFFFFF?text=${encodeURIComponent(
      query || "No Image"
    )}`;
  }

  const API_KEY = GOOGLE_CUSTOM_SEARCH_API_KEY;
  const CX = GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  const SEARCH_URL = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
    query
  )}&cx=${CX}&key=${API_KEY}&searchType=image&num=1`; // num=1 只返回一张图片

  try {
    const response = await fetch(SEARCH_URL);
    if (!response.ok) {
      // 如果响应不成功（例如 400, 403, 500 错误），抛出错误
      const errorText = await response.text();
      throw new Error(
        `Google Custom Search API error: ${response.status} - ${errorText}`
      );
    }
    const data = await response.json();

    // 检查是否有图片结果
    if (data.items && data.items.length > 0) {
      // 返回第一张图片的链接
      return data.items[0].link;
    }
  } catch (error) {
    console.error(`Error fetching real image for "${query}":`, error);
  }
  // 如果发生错误或没有找到图片，返回一个占位图
  return `https://placehold.co/400x200/CCCCCC/FFFFFF?text=${encodeURIComponent(
    query || "No Image"
  )}`;
}

// 类型定义（与你当前的 src/app/types/itinerary.ts 保持一致）
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

export async function POST(request: NextRequest) {
  const authResult = authenticateRequest(request);
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
      // budget,
      travelers,
      travelType,
      transportation,
      activityIntensity,
      specialNeeds,
      userId,
      // promptName = "default_itinerary_prompt.txt",
      promptName = "default_itinerary_prompt.txt",
    } = body;

    console.log("Backend preferences extracted:");
    console.log("   destination:", destination);
    console.log("   travelStartDate:", travelStartDate);
    console.log("   travelEndDate:", travelEndDate);
    // console.log("   budget:", budget);
    console.log("   travelers:", travelers);
    console.log("   travelType:", travelType);
    console.log("   transportation:", transportation);
    console.log("   activityIntensity:", activityIntensity);
    console.log("   specialNeeds:", specialNeeds);
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
        "in request body."
      );
      return NextResponse.json(
        {
          error: `Missing preferences in request body: ${missingFields.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // 1. Construct AI Prompt
    // ⭐ 修改这里：从文件中读取 prompt 模板
    const promptTemplate = await getPromptFromFile(promptName);

    // ⭐ 修改这里：使用 replace 方法替换占位符
    // 修改为匹配新的占位符格式
    const prompt = promptTemplate
      .replaceAll("{{destination}}", destination || "Flexible")
      .replaceAll("{{travelStartDate}}", travelStartDate || "Flexible")
      .replaceAll("{{travelEndDate}}", travelEndDate || "Flexible")
      .replaceAll("{{travelers}}", travelers || "Flexible")
      .replaceAll(
        "{{travelType}}",
        travelType && travelType.length > 0 ? travelType.join(", ") : "Flexible"
      )
      .replaceAll(
        "{{transportation}}",
        transportation && transportation.length > 0
          ? transportation.join(", ")
          : "Flexible"
      )
      .replaceAll("{{activityIntensity}}", activityIntensity || "Flexible")
      .replaceAll(
        "{{specialNeeds}}",
        specialNeeds && specialNeeds.length > 0
          ? specialNeeds.join(", ")
          : "None"
      );

    console.log("=== PROMPT DEBUG ===");
    console.log("Destination value:", destination);
    console.log("Final prompt being sent to AI:");
    console.log(prompt);
    console.log("=== END PROMPT DEBUG ===");

    // 2. Call Gemini API
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("AI Raw Response:", responseText);

    let generatedItineraryData: GeneratedItinerary;

    try {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      let jsonString = jsonMatch ? jsonMatch[1] : responseText;
      generatedItineraryData = JSON.parse(jsonString);

      if (
        !generatedItineraryData.name ||
        !generatedItineraryData.startDate ||
        !generatedItineraryData.endDate ||
        !Array.isArray(generatedItineraryData.itineraryDays)
      ) {
        throw new Error("AI response structure is not as expected.");
      }

      for (const day of generatedItineraryData.itineraryDays) {
        for (const activity of day.activities) {
          const imageUrl = await fetchRealImageUrl(activity.title);
          if (imageUrl) {
            activity.imageUrl = imageUrl;
          }
          activity.latitude =
            typeof activity.latitude === "number" ? activity.latitude : 0;
          activity.longitude =
            typeof activity.longitude === "number" ? activity.longitude : 0;
        }
      }
    } catch (parseError: any) {
      console.error(
        "Failed to parse AI generated JSON or process images:",
        parseError,
        responseText
      );
      return NextResponse.json(
        {
          error: `AI generated invalid JSON format or unexpected structure: ${parseError.message}`,
        },
        { status: 500 }
      );
    }

    // 4. Save AI-generated itinerary to the database
    const tripName = generatedItineraryData.name;
    const tripStartDate = new Date(generatedItineraryData.startDate);
    const tripEndDate = new Date(generatedItineraryData.endDate);

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
                imageUrl: activity.imageUrl || null, // 保存实际图片URL
              }))
          ),
        },
      },
      include: {
        locations: true,
      },
    });

    // 5. Return AI-generated itinerary to the frontend
    return NextResponse.json(generatedItineraryData.itineraryDays, {
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
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
