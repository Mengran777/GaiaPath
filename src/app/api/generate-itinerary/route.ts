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

// ⭐ 添加延迟函数避免 API 速率限制 ⭐
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // ⭐ 添加小延迟避免速率限制 ⭐
  await delay(50); // 50ms 延迟

  const API_KEY = GOOGLE_CUSTOM_SEARCH_API_KEY;
  const CX = GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  const SEARCH_URL = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
    query
  )}&cx=${CX}&key=${API_KEY}&searchType=image&num=1`; // num=1 只返回一张图片

  try {
    const response = await fetch(SEARCH_URL);
    if (!response.ok) {
      // 如果响应不成功，记录错误信息但不抛出异常
      const errorText = await response.text();
      console.warn(
        `Google Custom Search API error (${response.status}): ${errorText}`
      );
      console.warn(
        "Possible reasons: 1) API key invalid, 2) Daily quota exceeded (100 queries/day for free tier), 3) API not enabled"
      );
      // 直接返回占位图，不中断流程
      return `https://placehold.co/400x200/CCCCCC/FFFFFF?text=${encodeURIComponent(
        query || "No Image"
      )}`;
    }
    const data = await response.json();

    // 检查是否有图片结果
    if (data.items && data.items.length > 0) {
      // 返回第一张图片的链接
      return data.items[0].link;
    } else {
      console.warn(`No image results found for query: "${query}"`);
    }
  } catch (error) {
    console.error(
      `Error fetching real image for "${query}":`,
      error instanceof Error ? error.message : error
    );
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
      userRequest, // ⭐ 新增：用户的自定义需求
      userId,
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
    console.log("   userRequest:", userRequest); // ⭐ 新增日志
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

    console.log("=== PARALLEL GENERATION STARTED ===");
    console.log("Destination:", destination);
    console.log("Generating 3 routes in parallel with real images...");
    console.log("=== === === === === === === ===");

    // ⭐ 并行生成策略：同时生成 3 条精选路线 ⭐
    const routeThemes = [
      { id: "route-1", theme: "Classic Route", description: "Traditional tourist highlights and must-see attractions" },
      { id: "route-2", theme: "Cultural & Culinary", description: "Museums, historical sites, local cuisine and food experiences" },
      { id: "route-3", theme: "Nature & Hidden Gems", description: "Outdoor activities, natural landscapes, and off-the-beaten-path discoveries" },
    ];

    // 读取单条路线的 prompt 模板
    const singleRouteTemplate = await getPromptFromFile("single_route_prompt.txt");

    // 并行生成所有路线
    const generateRoutePromises = routeThemes.map(async (routeTheme) => {
      const routePrompt = singleRouteTemplate
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
        )
        .replaceAll(
          "{{userRequest}}",
          userRequest || "I want to have a great travel experience in " + (destination || "this location")
        )
        .replaceAll("{{theme}}", routeTheme.theme)
        .replaceAll("{{themeDescription}}", routeTheme.description)
        .replaceAll("{{routeId}}", routeTheme.id);

      // 重试函数（带指数退避）
      const generateWithRetry = async (maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          let responseText = ''; // 在外部定义，以便在 catch 中访问
          try {
            const model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
              generationConfig: {
                temperature: 0.7,  // Lower = faster, more focused
                maxOutputTokens: 8192,  // Further increased to ensure complete JSON
              },
            });

            const result = await model.generateContent(routePrompt);
            responseText = result.response.text();

            console.log(`✅ Generated route: ${routeTheme.theme} (attempt ${attempt})`);
            console.log(`📝 Response length: ${responseText.length} characters`);

            // 提取 JSON
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

            // 验证 JSON 是否完整
            if (!jsonString || jsonString.length < 10) {
              throw new Error(`JSON string too short or empty: "${jsonString.substring(0, 100)}..."`);
            }

            // 检查 JSON 是否以 } 结尾（完整的对象）
            if (!jsonString.trim().endsWith("}")) {
              console.warn(`⚠️ JSON may be incomplete for ${routeTheme.theme}`);
              console.log(`Last 200 chars: ...${responseText.substring(responseText.length - 200)}`);
            }

            return JSON.parse(jsonString);
          } catch (error: any) {
            const isOverloaded = error?.message?.includes('503') || error?.message?.includes('overloaded');
            const isJSONError = error?.message?.includes('JSON') || error?.name === 'SyntaxError';

            // 如果是 JSON 错误，打印更多调试信息
            if (isJSONError && responseText) {
              console.error(`🔍 JSON Parse Error for ${routeTheme.theme}:`);
              console.log(`First 300 chars: ${responseText.substring(0, 300)}`);
              console.log(`Last 300 chars: ...${responseText.substring(Math.max(0, responseText.length - 300))}`);
            }

            // 对于 503 错误或 JSON 错误，进行重试
            if ((isOverloaded || isJSONError) && attempt < maxRetries) {
              const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
              console.log(`⏳ Retrying ${routeTheme.theme} in ${waitTime/1000}s... (attempt ${attempt}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
              console.error(`❌ Failed to generate route ${routeTheme.theme} after ${attempt} attempts:`, error);
              return null;
            }
          }
        }
        return null;
      };

      return await generateWithRetry();
    });

    // 等待所有路线生成完成
    const generatedRoutes = await Promise.all(generateRoutePromises);

    // 过滤掉失败的路线
    let generatedItineraryData = generatedRoutes.filter((route): route is RouteOption => route !== null);

    // ⭐ 修复 highlights 格式 ⭐
    generatedItineraryData = generatedItineraryData.map(route => {
      // 如果 highlights 是字符串数组，转换为对象数组
      if (route.highlights && route.highlights.length > 0) {
        const firstHighlight = route.highlights[0];
        // 检查是否为字符串（需要转换）
        if (typeof firstHighlight === 'string') {
          // 为每个 highlight 添加合适的图标
          const iconMap: { [key: string]: string } = {
            'museum': '🏛️',
            'food': '🍽️',
            'nature': '🌳',
            'beach': '🏖️',
            'mountain': '⛰️',
            'shopping': '🛍️',
            'art': '🎨',
            'history': '📜',
            'culture': '🎭',
            'adventure': '🎒',
            'restaurant': '🍴',
            'cafe': '☕',
            'park': '🌲',
            'church': '⛪',
            'castle': '🏰',
            'palace': '👑',
            'market': '🏪',
            'lake': '🌊',
            'sunset': '🌅',
            'sunrise': '🌄'
          };

          route.highlights = (route.highlights as unknown as string[]).map((highlight: string) => {
            // 尝试匹配关键词找到合适的图标
            const lowerHighlight = highlight.toLowerCase();
            let icon = '✨'; // 默认图标

            for (const [keyword, emoji] of Object.entries(iconMap)) {
              if (lowerHighlight.includes(keyword)) {
                icon = emoji;
                break;
              }
            }

            return {
              label: highlight,
              icon: icon
            };
          });
        }
      }
      return route;
    });

    console.log(`✅ Successfully generated ${generatedItineraryData.length} routes in parallel`);

    // ⭐ 优化选项 ⭐
    // false = 占位图 (~10-15秒总时间)
    // true = 真实图片 (~20-30秒总时间)
    const FETCH_IMAGES = true; // 使用真实图片

    if (FETCH_IMAGES) {
      console.log("⚡ Fetching real images in parallel...");

      // ⭐ 收集所有需要获取图片的活动 ⭐
      const imagePromises: Promise<void>[] = [];

      for (const route of generatedItineraryData) {
        if (!route.itinerary || !Array.isArray(route.itinerary)) continue;

        for (const day of route.itinerary) {
          if (!day.activities || !Array.isArray(day.activities)) continue;

          for (const activity of day.activities) {
            // 并行获取每个活动的图片
            const promise = fetchRealImageUrl(activity.title).then((imageUrl) => {
              if (imageUrl) {
                activity.imageUrl = imageUrl;
              }
            });
            imagePromises.push(promise);

            // 确保坐标格式正确
            activity.latitude =
              typeof activity.latitude === "number" ? activity.latitude : 0;
            activity.longitude =
              typeof activity.longitude === "number" ? activity.longitude : 0;
          }
        }
      }

      // ⭐ 并行等待所有图片获取完成 ⭐
      console.log(`📸 Fetching ${imagePromises.length} images in parallel...`);
      await Promise.all(imagePromises);
      console.log("✅ All images fetched successfully!");
    } else {
      console.log("⚡ Using beautiful placeholder images for maximum speed");

      for (const route of generatedItineraryData) {
        if (!route.itinerary || !Array.isArray(route.itinerary)) continue;

        for (const day of route.itinerary) {
          if (!day.activities || !Array.isArray(day.activities)) continue;

          for (const activity of day.activities) {
            activity.latitude =
              typeof activity.latitude === "number" ? activity.latitude : 0;
            activity.longitude =
              typeof activity.longitude === "number" ? activity.longitude : 0;

            // 使用 Lorem Picsum 随机占位图（免费、美观、可靠）
            if (!activity.imageUrl) {
              // 使用活动标题作为种子，确保同样的活动总是显示相同的图片
              activity.imageUrl = `https://picsum.photos/seed/${encodeURIComponent(activity.title.substring(0, 20))}/400/200`;
            }
          }
        }
      }
      console.log("✅ Routes ready with beautiful placeholders!");
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
