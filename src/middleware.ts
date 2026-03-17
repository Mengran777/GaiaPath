import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import { getToken } from "next-auth/jwt";

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
  const { pathname } = request.nextUrl;

  const publicRoutes = ["/auth/login", "/auth/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // 1. Check existing custom JWT cookie
  let authenticated = authToken ? await isValidToken(authToken) : false;

  // 2. Fallback: NextAuth session token
  if (!authenticated) {
    try {
      const nextAuthToken = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET!,
      });
      if (nextAuthToken?.userId) authenticated = true;
    } catch {
      // ignore — treated as unauthenticated
    }
  }

  if (isPublicRoute) {
    if (authenticated) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!authenticated) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    if (authToken) {
      response.cookies.set("authToken", "", { expires: new Date(0), path: "/" });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/auth/:path*",
    // Exclude static assets, all /api/auth/* routes (both custom + NextAuth), and file extensions
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
  ],
};
