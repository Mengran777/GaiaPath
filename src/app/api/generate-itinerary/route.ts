// src/app/api/generate-itinerary/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import Prisma client
import { authenticateRequest } from "@/lib/auth"; // Import authentication helper function
// 导入 GoogleGenerativeAI
import { GoogleGenerativeAI } from "@google/generative-ai";

// 确保从环境变量获取 API 密钥，而不是硬编码
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  // 在实际应用中，这里应该有更健壮的错误处理或启动检查
  console.error("GEMINI_API_KEY is not set in environment variables.");
  // 生产环境可以考虑直接抛出错误或退出
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || ""); // 初始化 Gemini AI 客户端

/**
 * Handles POST requests to generate an itinerary using AI.
 * Path: /api/generate-itinerary
 */
export async function POST(request: NextRequest) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ⭐ 关键修复：直接获取整个 JSON body 对象 ⭐
    const body = await request.json(); // Get user preferences from the frontend

    console.log("Backend received raw request body:", body); // 这行现在可以正常工作了

    // Destructure the preferences directly from the 'body' object
    // 前端发送的字段都在这里直接解构
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
      userId, // Ensure userId is also destructured
    } = body;

    // Add detailed logging for each preference field
    console.log("Backend preferences extracted:");
    console.log("  destination:", destination);
    console.log("  travelStartDate:", travelStartDate);
    console.log("  travelEndDate:", travelEndDate);
    console.log("  budget:", budget);
    console.log("  travelers:", travelers);
    console.log("  travelType:", travelType);
    console.log("  accommodation:", accommodation);
    console.log("  transportation:", transportation);
    console.log("  activityIntensity:", activityIntensity);
    console.log("  specialNeeds:", specialNeeds);
    console.log("  userId:", userId);

    // 调整验证逻辑，检查解构后的变量
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

    // ⭐ 移除此行，因为它在 `body` 被正确获取后已不再需要且 `preferences` 变量不存在 ⭐
    // if (!preferences) {
    //   return NextResponse.json(
    //     { error: "Missing preferences in request body." },
    //     { status: 400 }
    //   );
    // }

    // 1. Construct AI Prompt
    // 调整 AI 提示词，直接使用解构后的变量
    const prompt = `
      你是一个专业的旅行规划助手。
      根据以下用户偏好，为他们生成一个详细的旅行行程。
      请确保行程内容丰富、符合主题，并提供每个活动的具体信息，包括地点、时间、描述、预估评分、预估价格和相关图片URL，以及**精确的经纬度**。
      图片URL可以使用 placeholder.co 服务生成，例如：https://placehold.co/400x200/FF5733/FFFFFF?text=ActivityName。
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
                "imageUrl": "https://placehold.co/400x200/FF5733/FFFFFF?text=Colosseum",
                "latitude": 41.8902,
                "longitude": 12.4922
              },
              {
                "title": "活动名称2",
                "description": "活动描述2",
                "time": "时间段2",
                "rating": 4.5,
                "price": "€5",
                "imageUrl": "https://placehold.co/400x200/33FF57/FFFFFF?text=Trevi+Fountain",
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
                "imageUrl": "https://placehold.co/400x200/3357FF/FFFFFF?text=Vatican+Museum",
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
    }); // 使用新的、更适合生产环境的模型

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("AI Raw Response:", responseText); // 调试用：打印AI原始响应

    let generatedItineraryData: any; // 声明为 any，稍后进行类型断言

    try {
      // 尝试从包含 ```json``` 块的文本中提取 JSON
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      let jsonString = jsonMatch ? jsonMatch[1] : responseText;

      generatedItineraryData = JSON.parse(jsonString);

      // 验证顶层结构
      if (
        !generatedItineraryData.name ||
        !generatedItineraryData.startDate ||
        !generatedItineraryData.endDate ||
        !Array.isArray(generatedItineraryData.itineraryDays)
      ) {
        throw new Error("AI response structure is not as expected.");
      }
    } catch (parseError: any) {
      // 捕获错误时明确类型
      console.error(
        "Failed to parse AI generated JSON:",
        parseError,
        responseText
      );
      return NextResponse.json(
        {
          error: `AI generated invalid JSON format or unexpected structure: ${parseError.message}`,
        }, // 包含解析错误信息
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
          create: generatedItineraryData.itineraryDays.flatMap((day: any) =>
            day.activities.map((activity: any, index: number) => ({
              name: activity.title,
              description: activity.description,
              latitude: activity.latitude || 0, // 确保有经纬度，如果 AI 没给就用 0
              longitude: activity.longitude || 0,
              notes: activity.notes || "",
              order: day.day * 1000 + index,
              time: activity.time,
              rating: activity.rating,
              price: activity.price,
              imageUrl: activity.imageUrl,
            }))
          ),
        },
      },
      include: {
        locations: true,
      },
    });

    return NextResponse.json(generatedItineraryData.itineraryDays, {
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in AI itinerary generation API:", error);
    return NextResponse.json(
      { error: `Internal Server Error during AI generation: ${error.message}` },
      { status: 500 }
    );
  }
}
