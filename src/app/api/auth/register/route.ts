// src/app/api/auth/register/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // Import the Prisma client
import { hashPassword } from "@/lib/auth"; // Import the password hashing function

/**
 * Handles POST requests for user registration.
 * Path: /api/auth/register
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Basic input validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: username, email, password" },
        { status: 400 }
      );
    }

    // Check if a user with the given email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 409 }
      ); // 409 Conflict
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the new user in the database
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword, // Store the hashed password
      },
      // Select only necessary fields to return, avoid sending hashed password back
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    // Return a success message and the new user's public details
    return NextResponse.json(
      { message: "User registered successfully.", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during user registration:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
