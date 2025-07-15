// src/app/api/trips/[tripId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // 导入 Prisma 客户端
import { authenticateRequest } from "@/lib/auth"; // 导入认证辅助函数

/**
 * 处理 GET 请求，获取特定行程及其位置，确保用户已认证。
 * 路径：/api/trips/{tripId}
 */
export async function GET(
  request: NextRequest,
  context: { params: { tripId: string } }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = context.params; // 从 context 中获取 tripId

  try {
    // 查找特定用户的行程及其位置
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId: authResult.userId, // 确保用户拥有该行程
      },
      include: {
        locations: {
          orderBy: {
            order: "asc", // 按位置的 'order' 字段排序
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(trip, { status: 200 });
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * 处理 PUT 请求，更新特定行程的信息。
 * 路径：/api/trips/{tripId}
 */
export async function PUT(
  request: NextRequest,
  context: { params: { tripId: string } }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = context.params; // 从 context 中获取 tripId

  try {
    const body = await request.json();
    const { name, startDate, endDate } = body;

    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId, userId: authResult.userId },
      select: { id: true },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        name: name || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    return NextResponse.json(updatedTrip, { status: 200 });
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * 处理 DELETE 请求，删除特定行程。
 * 路径：/api/trips/{tripId}
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { tripId: string } }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = context.params; // 从 context 中获取 tripId

  try {
    const deleteResult = await prisma.trip.deleteMany({
      where: {
        id: tripId,
        userId: authResult.userId,
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Trip deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
