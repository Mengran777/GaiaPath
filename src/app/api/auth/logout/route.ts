// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json(
      { message: "Logout successful" },
      { status: 200 }
    );

    response.cookies.set({
      name: "authToken",
      value: "",
      httpOnly: true,
      path: "/",
      expires: new Date(0),
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
