// src/app/api/generate-itinerary/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
      budget,
      travelers,
      travelType,
      transportation,
      activityIntensity,
      specialNeeds,
      userId,
    } = body;

    console.log("Backend preferences extracted:");
    console.log("   destination:", destination);
    console.log("   travelStartDate:", travelStartDate);
    console.log("   travelEndDate:", travelEndDate);
    console.log("   budget:", budget);
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
    const prompt = `
You are a professional travel planning assistant with expertise in creating detailed, personalized itineraries.
Based on the following user preferences, generate a comprehensive travel itinerary that is rich in content, thematically coherent, and provides specific information for each activity including location, timing, description, estimated rating, estimated price, and **accurate latitude/longitude coordinates**.

**IMPORTANT: Do NOT include the imageUrl field in the JSON response, as this will be populated separately by the backend image search tool.**

Please provide an appropriate overall name for the entire itinerary, along with the trip's start date and end date as top-level fields.
The itinerary should include at least 3 days with 2-3 activities per day.

**User Preferences:**
Destination: ${destination || "Flexible"}
Start Date: ${travelStartDate || "Flexible"}
End Date: ${travelEndDate || "Flexible"}
Budget: ${budget ? `$${budget.toLocaleString()}` : "Flexible"}
Number of Travelers: ${travelers || "Flexible"}
Travel Type: ${
      travelType && travelType.length > 0 ? travelType.join(", ") : "Flexible"
    }
Transportation Preference: ${
      transportation && transportation.length > 0
        ? transportation.join(", ")
        : "Flexible"
    }
Activity Intensity: ${activityIntensity || "Flexible"}
Special Requirements: ${
      specialNeeds && specialNeeds.length > 0 ? specialNeeds.join(", ") : "None"
    }

**REQUIREMENTS:**
1. CRITICAL: Ensure all coordinates are real, precise, and verifiable GPS coordinates for the named location. Do NOT return zeros or generic city coordinates.
2. Include realistic pricing in local currency where applicable
3. Provide accurate time estimates for each activity
4. Ensure activities are logistically feasible and well-sequenced
5. Consider travel time between locations when scheduling
6. Match activities to the specified travel type and intensity level
7. Account for budget constraints when suggesting activities

Return the itinerary data in the following strict JSON format. 
**Return ONLY the JSON without any additional text or explanations.**

\`\`\`json
{
  "name": "Trip name, e.g.: Renaissance Discovery: Rome & Florence",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "itineraryDays": [
    {
      "day": 1,
      "title": "Daily theme or main location, e.g.: Ancient Rome Exploration",
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "title": "Activity name, e.g.: Colosseum",
          "description": "Detailed activity description including what visitors will experience, historical context, or unique features.",
          "time": "Time slot, e.g.: 09:00-12:00",
          "rating": 4.8,
          "price": "Price or 'Free', e.g.: €18 or Free",
          "latitude": 41.8902,
          "longitude": 12.4922
        },
        {
          "title": "Second activity name",
          "description": "Second activity description with relevant details and visitor information.",
          "time": "Time slot for second activity",
          "rating": 4.5,
          "price": "€5",
          "latitude": 41.9009,
          "longitude": 12.4833
        }
      ]
    },
    {
      "day": 2,
      "title": "Vatican City Deep Dive",
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "title": "Vatican Museums & Sistine Chapel",
          "description": "Experience Michelangelo's masterpieces and the world's most extensive art collection in the papal palace complex.",
          "time": "08:00-12:00",
          "rating": 4.9,
          "price": "€22",
          "latitude": 41.9064,
          "longitude": 12.4537
        }
      ]
    }
  ]
}
\`\`\`
**Additional Guidelines:**
- Focus on must-see attractions while balancing popular sites with hidden gems
- Consider seasonal factors and local events if dates are specified
- Ensure accessibility requirements are met if specified in special needs
- Optimize for the specified travel type (cultural, adventure, relaxation, etc.)
- Include practical information like opening hours considerations in time slots
- Suggest realistic pricing based on current market rates
- Ensure geographical coherence to minimize travel time between activities
`;

    // 2. Call Gemini API
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
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
