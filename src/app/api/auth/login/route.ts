// src/app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { comparePassword, generateToken } from "@/lib/auth";

/**
 * 处理用户登录的 POST 请求
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 基本输入验证
    if (!email || !password) {
      return NextResponse.json(
        { error: "缺少必填字段：email, password" },
        { status: 400 }
      );
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "无效的邮箱格式" },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }, // 邮箱统一小写
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" }, // 不透露具体是哪个字段错误
        { status: 401 }
      );
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 生成 JWT token
    const token = generateToken(user.id);

    // 创建响应
    const response = NextResponse.json(
      {
        message: "登录成功",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === "production";
    const ONE_HOUR = 60 * 60; // 1小时（秒）

    // 设置安全的 authToken cookie
    response.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: true, // 🔒 防止 XSS 攻击
      path: "/",
      maxAge: ONE_HOUR,
      sameSite: "lax", // 🔒 防止 CSRF 攻击
      secure: isProduction, // 🔒 生产环境使用 HTTPS
    });

    // 设置用户 ID cookie（客户端可读）
    response.cookies.set({
      name: "userId",
      value: user.id,
      httpOnly: false,
      path: "/",
      maxAge: ONE_HOUR,
      sameSite: "lax",
      secure: isProduction,
    });

    return response;
  } catch (error) {
    console.error("用户登录时发生错误:", error);
    
    // 不向客户端暴露内部错误详情
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}