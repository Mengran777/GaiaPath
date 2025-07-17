// src/app/api/user/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // 导入 Prisma 客户端

/**
 * Handles GET requests for fetching user details by ID.
 * Path: /api/user/[id]
 */
export async function GET(
  request: Request,
  // Keep the destructuring for clarity. The issue is with accessing properties *after* params is passed.
  // The type for `params` is still { id: string }, but its runtime behavior is now Promise-like.
  { params }: { params: { id: string } }
) {
  try {
    // ⭐ THE FIX: AWAITING `params` ITSELF before accessing its properties.
    // This is the most direct interpretation of the error message.
    // Next.js is explicitly telling us to treat `params` as something that needs to be awaited.
    const awaitedParams = await Promise.resolve(params); // Wrap in Promise.resolve to handle both sync and async
    const userId: string = awaitedParams.id; // Now access `id` from the awaited object

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId }, // Use the extracted userId
      // 只选择你需要返回的字段，避免暴露敏感信息如密码哈希
      select: {
        id: true,
        username: true,
        email: true,
        // ...其他你希望在客户端显示的用户信息
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
