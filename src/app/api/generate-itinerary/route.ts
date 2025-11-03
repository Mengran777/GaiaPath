// src/app/api/generate-itinerary/route.ts
import { RouteOption } from "@/types/routes";
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
      // promptName = "default_itinerary_prompt.txt",
      promptName = "multiple_routes_prompt.txt",
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

    let generatedItineraryData: RouteOption[];

    try {
      // 步骤 1: 提取 JSON（处理多种可能的格式）
      let jsonString = responseText.trim();

      // 移除 markdown 代码块标记（更宽松的匹配）
      const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }

      // 如果没有找到代码块，尝试直接提取 JSON 数组
      if (!jsonString.startsWith("[")) {
        const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonString = arrayMatch[0];
        } else {
          throw new Error("No JSON array found in AI response");
        }
      }

      console.log(
        "Extracted JSON string (first 200 chars):",
        jsonString.substring(0, 200) + "..."
      );

      // 步骤 2: 解析 JSON
      generatedItineraryData = JSON.parse(jsonString);

      // 步骤 3: 验证是数组
      if (!Array.isArray(generatedItineraryData)) {
        throw new Error(
          "AI must return an array of routes, got: " +
            typeof generatedItineraryData
        );
      }

      console.log(
        `✅ Successfully parsed ${generatedItineraryData.length} routes`
      );

      // 步骤 4: 为每条路线添加 ID（如果缺失）并获取图片
      for (let i = 0; i < generatedItineraryData.length; i++) {
        const route = generatedItineraryData[i];

        // 确保每条路线有 ID
        if (!route.id) {
          route.id = `route-${Date.now()}-${i}`;
          console.log(`⚠️  Added missing ID to route ${i}: ${route.id}`);
        }

        // 确保有 itinerary 数组
        if (!route.itinerary || !Array.isArray(route.itinerary)) {
          console.warn(
            `⚠️  Route ${route.id} has invalid itinerary, skipping image fetch`
          );
          continue;
        }

        console.log(
          `Processing route ${i + 1}/${generatedItineraryData.length}: ${
            route.title || route.id
          }`
        );

        // 处理每天的行程
        for (const day of route.itinerary) {
          if (!day.activities || !Array.isArray(day.activities)) {
            continue;
          }

          for (const activity of day.activities) {
            // 获取真实图片
            const imageUrl = await fetchRealImageUrl(activity.title);
            if (imageUrl) {
              activity.imageUrl = imageUrl;
            }

            // 确保坐标是数字
            activity.latitude =
              typeof activity.latitude === "number" ? activity.latitude : 0;
            activity.longitude =
              typeof activity.longitude === "number" ? activity.longitude : 0;
          }
        }
      }

      console.log("✅ Successfully processed all routes with images");
    } catch (parseError: any) {
      console.error("=== JSON PARSE ERROR ===");
      console.error("Error:", parseError.message);
      console.error(
        "Raw AI response (first 500 chars):",
        responseText.substring(0, 500)
      );
      console.error("========================");

      return NextResponse.json(
        {
          error: `AI generated invalid JSON format: ${parseError.message}`,
          details: responseText.substring(0, 200) + "...",
          hint: "Check if AI returned text instead of JSON array",
        },
        { status: 500 }
      );
    }

    // ============ 暂时注释掉数据库保存 ============
    // 原因：现在返回多条路线，等用户选择后再保存
    /*
    // 4. Save AI-generated itinerary to the database
    const tripName = generatedItineraryData.name;

    // 解析日期时间 - 处理可能的格式问题
    let tripStartDate: Date;
    let tripEndDate: Date;

    try {
      // 尝试解析 AI 返回的日期
      tripStartDate = new Date(generatedItineraryData.startDate);
      tripEndDate = new Date(generatedItineraryData.endDate);

      // 如果解析失败，使用用户输入的日期
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
      // 回退到用户输入的日期
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
    // ============ 数据库保存结束 ============

    // 5. Return AI-generated itinerary to the frontend
    // 5. Return AI-generated routes to the frontend
    return NextResponse.json(generatedItineraryData, {
      // 改这里
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
