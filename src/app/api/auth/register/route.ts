// src/app/api/auth/register/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * 处理用户注册的 POST 请求
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // 基本输入验证
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "缺少必填字段：username, email, password" },
        { status: 400 }
      );
    }

    // 验证规则
    const validationErrors = [];

    // 用户名验证
    if (username.length < 3 || username.length > 20) {
      validationErrors.push("用户名长度必须在 3-20 个字符之间");
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      validationErrors.push("用户名只能包含字母、数字、下划线和中文");
    }

    // 邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      validationErrors.push("邮箱格式无效");
    }

    // 密码验证
    if (password.length < 8) {
      validationErrors.push("密码长度至少为 8 个字符");
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      validationErrors.push(
        "密码必须包含至少一个大写字母、一个小写字母和一个数字"
      );
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join("；") },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmailUser) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
    }

    // 检查用户名是否已存在
    const existingUsernameUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsernameUser) {
      return NextResponse.json({ error: "该用户名已被使用" }, { status: 409 });
    }

    // 哈希密码
    const hashedPassword = await hashPassword(password);

    // 创建新用户
    const newUser = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "用户注册成功",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("用户注册时发生错误:", error);

    // 处理数据库唯一约束错误
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "邮箱或用户名已被使用" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
