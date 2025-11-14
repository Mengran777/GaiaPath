// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

/**
 * 处理用户登出的 POST 请求
 * 清除所有认证相关的 cookies
 */
export async function POST() {
  try {
    const response = NextResponse.json(
      { message: "登出成功" },
      { status: 200 }
    );

    // 清除所有认证相关的 cookies
    const cookiesToClear = ["authToken", "userId", "isLoggedIn"];

    cookiesToClear.forEach((cookieName) => {
      response.cookies.set({
        name: cookieName,
        value: "",
        httpOnly: cookieName === "authToken", // authToken 需要 httpOnly
        path: "/",
        expires: new Date(0), // 设置为过期
        sameSite: "lax",
      });
    });

    return response;
  } catch (error) {
    console.error("登出时发生错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
