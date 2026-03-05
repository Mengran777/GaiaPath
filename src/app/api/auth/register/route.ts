// src/app/api/auth/register/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * Handle user registration POST request
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

    // Validation rules
    const validationErrors = [];

    // Username validation
    if (username.length < 3 || username.length > 20) {
      validationErrors.push("Username must be between 3 and 20 characters");
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      validationErrors.push("Username can only contain letters, numbers, underscores, and Chinese characters");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      validationErrors.push("Invalid email format");
    }

    // Password validation
    if (password.length < 8) {
      validationErrors.push("Password must be at least 8 characters");
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      validationErrors.push(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      );
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join("; ") },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmailUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Check if username already exists
    const existingUsernameUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsernameUser) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
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
        message: "User registered successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during user registration:", error);

    // Handle database unique constraint error
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Email or username is already in use" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
