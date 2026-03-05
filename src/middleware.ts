import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";

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

  const authenticated = authToken ? await isValidToken(authToken) : false;

  if (isPublicRoute) {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    // If token exists but is invalid/expired, clear it
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth/login|api/auth/register|api/auth/logout).*)",
  ],
};
