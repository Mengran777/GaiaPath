import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import { getToken } from "next-auth/jwt";

// The planner works without an account (guest mode), so pages and the AI
// routes are open; routes that touch a user's data (/api/favorites, /api/me)
// check auth themselves. The only job left here: send signed-in users away
// from the login and register pages.

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "");

async function isValidToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get("authToken")?.value;
  let authenticated = authToken ? await isValidToken(authToken) : false;

  if (!authenticated) {
    try {
      const nextAuthToken = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET! });
      if (nextAuthToken?.userId) authenticated = true;
    } catch {
      // treated as signed out
    }
  }

  if (authenticated) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/login", "/auth/register"],
};
