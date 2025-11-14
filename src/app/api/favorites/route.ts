// src/app/api/favorites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import prisma from "@/lib/db";

// GET: 获取用户的所有收藏路线
export async function GET(request: NextRequest) {
  try {
    const authResult = authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing token" },
        { status: 401 }
      );
    }

    const { userId } = authResult;

    // 从数据库获取用户的所有收藏
    const favorites = await prisma.favoriteRoute.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc", // 最新收藏的在前面
      },
    });

    // 解析 JSON 数据并返回
    const routesData = favorites.map((fav: any) => ({
      ...JSON.parse(fav.routeData),
      favoriteId: fav.id, // 添加收藏记录的 ID，方便后续删除
    }));

    return NextResponse.json(routesData, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites", details: error.message },
      { status: 500 }
    );
  }
}

// POST: 添加或删除收藏
export async function POST(request: NextRequest) {
  try {
    const authResult = authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing token" },
        { status: 401 }
      );
    }

    const { userId } = authResult;

    const body = await request.json();
    const { routeId, routeData, action } = body;

    if (!routeId) {
      return NextResponse.json(
        { error: "Missing required field: routeId" },
        { status: 400 }
      );
    }

    if (action === "remove") {
      // 删除收藏
      await prisma.favoriteRoute.deleteMany({
        where: {
          userId: userId,
          routeId: routeId,
        },
      });

      return NextResponse.json(
        { message: "Favorite removed successfully", routeId },
        { status: 200 }
      );
    } else if (action === "add") {
      // 添加收藏
      if (!routeData) {
        return NextResponse.json(
          { error: "Missing required field: routeData" },
          { status: 400 }
        );
      }

      // 检查是否已经收藏
      const existing = await prisma.favoriteRoute.findFirst({
        where: {
          userId: userId,
          routeId: routeId,
        },
      });

      if (existing) {
        return NextResponse.json(
          { message: "Route already favorited", routeId },
          { status: 200 }
        );
      }

      // 创建新的收藏记录
      const favorite = await prisma.favoriteRoute.create({
        data: {
          userId: userId,
          routeId: routeId,
          routeData: JSON.stringify(routeData),
        },
      });

      return NextResponse.json(
        { message: "Favorite added successfully", favoriteId: favorite.id, routeId },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'add' or 'remove'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error managing favorite:", error);
    return NextResponse.json(
      { error: "Failed to manage favorite", details: error.message },
      { status: 500 }
    );
  }
}
