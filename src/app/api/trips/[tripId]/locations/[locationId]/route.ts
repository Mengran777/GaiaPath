// src/app/api/trips/[tripId]/locations/[locationId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // 引入 Prisma 客户端
import { authenticateRequest } from "@/lib/auth"; // 引入身份验证辅助函数

/**
 * 辅助函数：查找位置并验证所有权。
 * 确保位置存在且属于指定的行程和用户。
 */
async function findLocationAndVerifyOwnership(
  locationId: string,
  tripId: string,
  userId: string
) {
  const location = await prisma.location.findUnique({
    where: {
      id: locationId,
      tripId: tripId,
      trip: {
        userId: userId, // 确保行程也属于该用户
      },
    },
  });
  return location;
}

/**
 * 处理 PUT 请求：更新行程中的特定位置。
 * 路径：/api/trips/{tripId}/locations/{locationId}
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tripId: string; locationId: string }> }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 等待解析动态参数
  const { tripId, locationId } = await context.params;

  try {
    const body = await request.json();
    const { name, latitude, longitude, notes, order } = body;

    // 验证位置的所有权
    const existingLocation = await findLocationAndVerifyOwnership(
      locationId,
      tripId,
      authResult.userId
    );

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found or unauthorized" },
        { status: 404 }
      );
    }

    // 更新数据库中的位置
    const updatedLocation = await prisma.location.update({
      where: {
        id: locationId,
      },
      data: {
        name: name || undefined,
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        notes: notes !== undefined ? notes : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
      },
    });

    return NextResponse.json(updatedLocation, { status: 200 });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * 处理 DELETE 请求：删除行程中的特定位置。
 * 路径：/api/trips/{tripId}/locations/{locationId}
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tripId: string; locationId: string }> }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 等待解析动态参数
  const { tripId, locationId } = await context.params;

  try {
    // 验证位置的所有权
    const existingLocation = await findLocationAndVerifyOwnership(
      locationId,
      tripId,
      authResult.userId
    );

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found or unauthorized" },
        { status: 404 }
      );
    }

    // 删除数据库中的位置
    await prisma.location.delete({
      where: {
        id: locationId,
      },
    });

    return NextResponse.json(
      { message: "Location deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
