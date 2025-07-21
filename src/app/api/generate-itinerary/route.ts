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
      accommodation,
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
    console.log("   accommodation:", accommodation);
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
      你是一个专业的旅行规划助手。
      根据以下用户偏好，为他们生成一个详细的旅行行程。
      请确保行程内容丰富、符合主题，并提供每个活动的具体信息，包括地点、时间、描述、预估评分、预估价格，以及**精确的经纬度**。
      **不要在 JSON 中包含 imageUrl 字段，这个将由后端单独的图片搜索工具来填充。**
      请为整个行程提供一个合适的总名称 (name)，以及行程的开始日期 (startDate) 和结束日期 (endDate)，这些应该作为顶级字段。
      行程应至少包含 3 天，每天 2-3 个活动。

      用户偏好：
      目的地: ${destination || "不限"}
      开始日期: ${travelStartDate || "不限"}
      结束日期: ${travelEndDate || "不限"}
      预算: ¥${budget ? budget.toLocaleString() : "不限"}
      旅行人数: ${travelers || "不限"}
      旅行类型: ${
        travelType && travelType.length > 0 ? travelType.join(", ") : "不限"
      }
      住宿偏好: ${accommodation || "不限"}
      交通偏好: ${
        transportation && transportation.length > 0
          ? transportation.join(", ")
          : "不限"
      }
      活动强度: ${activityIntensity || "不限"}
      特殊需求: ${
        specialNeeds && specialNeeds.length > 0 ? specialNeeds.join(", ") : "无"
      }

      请以以下严格的 JSON 格式返回行程数据。请确保经纬度是真实的地点坐标，而不是 0。
      请只返回 JSON，不要包含任何额外的文本或解释。

      \`\`\`json
      {
        "name": "旅行名称，例如：罗马与佛罗伦萨文艺复兴之旅",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "itineraryDays": [
          {
            "day": 1,
            "title": "当天的概要或主要地点，例如：罗马探索日",
            "date": "YYYY-MM-DD",
            "activities": [
              {
                "title": "活动名称，例如：罗马斗兽场",
                "description": "活动描述，例如：参观古罗马的标志性建筑。",
                "time": "时间段，例如：09:00-12:00",
                "rating": 4.8,
                "price": "价格或'Free'，例如：€18",
                "latitude": 41.8902,
                "longitude": 12.4922
              },
              {
                "title": "活动名称2",
                "description": "活动描述2",
                "time": "时间段2",
                "rating": 4.5,
                "price": "€5",
                "latitude": 41.9009,
                "longitude": 12.4833
              }
            ]
          },
          {
            "day": 2,
            "title": "梵蒂冈城深度游",
            "date": "YYYY-MM-DD",
            "activities": [
              {
                "title": "梵蒂冈博物馆与西斯廷教堂",
                "description": "欣赏米开朗基罗的壁画。",
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
