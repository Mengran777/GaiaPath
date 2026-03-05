// src/app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { comparePassword, generateToken } from "@/lib/auth";

/**
 * Handle user login POST request
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Basic input validation
    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email, password" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }, // normalize email to lowercase
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" }, // Don't reveal which field is incorrect
        { status: 401 }
      );
    }

    // Validate password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Create response
    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === "production";
    const ONE_HOUR = 60 * 60; // 1 hour (in seconds)
    // Set secure authToken cookie
    response.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: ONE_HOUR,
      sameSite: "lax",
      secure: isProduction,
    });

    return response;
  } catch (error) {
    console.error("Error during user login:", error);

    // Don't expose internal error details to client
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
