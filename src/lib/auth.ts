// src/lib/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { NextRequest } from "next/server";

// 环境变量配置
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || "1h";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * 比较密码
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 生成 JWT Token（简化版，避免 TypeScript 类型问题）
 */
export function generateToken(userId: string): string {
  try {
    return jwt.sign({ userId }, JWT_SECRET as string, {
      expiresIn: TOKEN_EXPIRATION,
    });
  } catch (error) {
    console.error("Error generating JWT token:", error);
    throw new Error("Failed to generate authentication token");
  }
}

/**
 * 验证 JWT Token（简化版）
 */
export function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as any;
    return decoded.userId || null;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("JWT verification failed:", error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.error("JWT expired:", error.message);
    } else {
      console.error("Unknown JWT error:", error);
    }
    return null;
  }
}

/**
 * 从 cookies 中获取 token
 */
function getTokenFromCookies(request: NextRequest): string | null {
  try {
    const cookieValue = request.cookies.get("authToken")?.value;
    return cookieValue || null;
  } catch (error) {
    console.error("Error reading token from cookies:", error);
    return null;
  }
}

/**
 * 从 Authorization header 中获取 token
 */
function getTokenFromHeader(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    return authHeader.split(" ")[1];
  } catch (error) {
    console.error("Error reading token from header:", error);
    return null;
  }
}

/**
 * 认证请求（支持 cookies 和 Authorization header）
 */
export function authenticateRequest(
  request: NextRequest
): { userId: string } | null {
  try {
    // 优先从 cookies 获取 token，如果没有则从 header 获取
    let token = getTokenFromCookies(request);

    if (!token) {
      token = getTokenFromHeader(request);
    }

    if (!token) {
      return null;
    }

    const userId = verifyToken(token);

    if (!userId) {
      return null;
    }

    return { userId };
  } catch (error) {
    console.error("Error during request authentication:", error);
    return null;
  }
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("密码长度至少为8个字符");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("密码必须包含至少一个小写字母");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("密码必须包含至少一个大写字母");
  }

  if (!/\d/.test(password)) {
    errors.push("密码必须包含至少一个数字");
  }

  return errors;
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证用户名格式
 */
export function validateUsername(username: string): string[] {
  const errors: string[] = [];

  if (username.length < 3 || username.length > 20) {
    errors.push("用户名长度必须在 3-20 个字符之间");
  }

  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    errors.push("用户名只能包含字母、数字、下划线和中文");
  }

  return errors;
}
