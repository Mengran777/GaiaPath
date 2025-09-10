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

    // --- ⭐ IMPORTANT CHANGE STARTS HERE ⭐ ---

    // Create a response object
    const response = NextResponse.json(
      {
        message: "Login successful.",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 }
    );

    // Calculate token expiration for cookie (e.g., 1 hour from now)
    // The 'generateToken' function ideally should return or allow setting expiry
    // For simplicity, let's assume a default expiration if not handled by generateToken
    const ONE_HOUR = 60 * 60; // seconds

    // Set the authToken as an HttpOnly Cookie
    // HttpOnly: Prevents client-side scripts from accessing the cookie
    // Path: All paths have access to this cookie
    // Max-Age: Cookie expiration in seconds. Should match JWT expiration.
    // SameSite: 'Lax' helps protect against CSRF attacks.
    // Secure: true should be used in production (HTTPS).
    response.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: false,
      path: "/",
      maxAge: ONE_HOUR, // Set this to match your JWT's expiration (e.g., 1 hour)
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // Use secure: true in production
    });

    // Set the userId as a regular cookie (not HttpOnly)
    // This allows client-side JS to read userId if needed, but not the sensitive token.
    response.cookies.set({
      name: "userId",
      value: user.id,
      httpOnly: false, // Can be read by client-side JavaScript
      path: "/",
      maxAge: ONE_HOUR, // Match token expiration
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // --- ⭐ IMPORTANT CHANGE ENDS HERE ⭐ ---

    return response; // Return the response with cookies set
  } catch (error) {
    console.error("Error during user login:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
