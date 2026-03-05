// src/lib/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { NextRequest } from "next/server";

// Environment variable configuration
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || "1h";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compare passwords
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT Token (simplified version, avoids TypeScript type issues)
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
 * Verify JWT Token (simplified version)
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
 * Get token from cookies
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
 * Get token from Authorization header
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
 * Authenticate request (supports cookies and Authorization header)
 */
export function authenticateRequest(
  request: NextRequest
): { userId: string } | null {
  try {
    // Prefer token from cookies, fall back to header
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
 * Validate password strength
 */
export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 */
export function validateUsername(username: string): string[] {
  const errors: string[] = [];

  if (username.length < 3 || username.length > 20) {
    errors.push("Username must be between 3 and 20 characters");
  }

  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, underscores, and Chinese characters");
  }

  return errors;
}
