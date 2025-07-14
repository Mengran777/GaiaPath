// src/app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import the Prisma client
import { comparePassword, generateToken } from "@/lib/auth"; // Import password comparison and token generation functions

/**
 * Handles POST requests for user login.
 * Path: /api/auth/login
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

    // Find the user by email in the database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // If user not found, return unauthorized error
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await comparePassword(password, user.password);

    // If passwords do not match, return unauthorized error
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Generate a JWT token for the authenticated user
    const token = generateToken(user.id);

    // Return a success message, the generated token, and basic user details
    return NextResponse.json(
      {
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during user login:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
