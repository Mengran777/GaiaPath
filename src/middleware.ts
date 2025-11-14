import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  console.log("🔒 MIDDLEWARE RUNNING for path:", request.nextUrl.pathname);

  const authToken = request.cookies.get("authToken")?.value;
  console.log("🔑 authToken exists:", !!authToken);

  const { pathname } = request.nextUrl;

  console.log("Middleware executing for:", pathname, "authToken:", !!authToken);

  // 定义公开路由（不需要登录的页面）
  const publicRoutes = ["/auth/login", "/auth/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // 如果访问的是公开路由
  if (isPublicRoute) {
    // 已登录用户访问登录/注册页，重定向到首页
    if (authToken) {
      console.log("Authenticated user accessing auth page, redirecting to /");
      return NextResponse.redirect(new URL("/", request.url));
    }
    // 未登录用户访问登录/注册页，允许访问
    return NextResponse.next();
  }

  // 访问受保护路由但未登录，重定向到登录页
  if (!authToken) {
    console.log(
      "Unauthenticated user accessing protected route, redirecting to /auth/login"
    );
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // 已登录用户访问受保护路由，允许访问
  return NextResponse.next();
}

// 定义中间件应该匹配的路径
export const config = {
  matcher: [
    "/",
    "/auth/:path*",
    // 不要排除所有 API，只排除不需要认证的
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth/login|api/auth/register|api/auth/logout).*)",
  ],
};
