import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // 导入 Prisma 客户端
import { authenticateRequest } from "@/lib/auth"; // 导入认证辅助函数

/**
 * 处理 POST 请求，为特定行程添加新位置。
 * 路径：/api/trips/{tripId}/locations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const authResult = authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params; // 使用 await 解构 tripId

  try {
    const body = await request.json();
    const { name, latitude, longitude, notes, order } = body;

    // 基本验证必需的位置信息字段
    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          error: "Missing required location fields: name, latitude, longitude",
        },
        { status: 400 }
      );
    }

    // 首先，验证行程是否存在并且属于已认证的用户
    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId, userId: authResult.userId },
      select: { id: true }, // 仅选择 ID 以确认存在性和所有权
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found or unauthorized" },
        { status: 404 }
      );
    }

    // 创建与行程关联的新位置
    const newLocation = await prisma.location.create({
      data: {
        name,
        latitude,
        longitude,
        notes: notes || "", // 如果未提供备注，则使用空字符串
        order: order !== undefined ? order : 0, // 使用提供的顺序或默认为 0
        tripId: tripId, // 将位置与行程关联
      },
    });

    // 返回新创建的位置
    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error("Error adding location to trip:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
