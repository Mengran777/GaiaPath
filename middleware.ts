// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 从请求的 cookies 中获取 authToken。
  // 因为 authToken 被设置为 HttpOnly，所以只能在服务器端（包括中间件）访问。
  const authToken = request.cookies.get('authToken')?.value;
  const { pathname } = request.nextUrl;

  // 1. 定义需要认证才能访问的受保护路径
  // 任何不是以 /auth 开头的路径都被认为是受保护的
  const protectedPaths = !pathname.startsWith('/auth');

  // 2. 如果用户未认证 (没有 authToken) 且尝试访问受保护路径
  if (!authToken && protectedPaths) {
    // 重定向到登录页
    console.log(`Middleware: No authToken, redirecting ${pathname} to /auth/login`);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 3. 如果用户已认证 (有 authToken) 且尝试访问认证页面 (例如 /auth/login 或 /auth/register)
  if (authToken && pathname.startsWith('/auth')) {
    // 重定向到主页或仪表盘
    console.log(`Middleware: Authenticated, redirecting ${pathname} to /`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. 其他情况：允许请求继续（例如访问 /auth 页面未认证，或访问受保护页面已认证）
  return NextResponse.next();
}

// 定义中间件应该匹配的路径
export const config = {
  // 匹配所有路径，除了 Next.js 内部的 API 路由和静态资源
  // 这样做是为了避免中间件处理不必要的请求，提高性能
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - /api (API 路由)
     * - /_next/static (静态文件)
     * - /_next/image (图片优化文件)
     * - /favicon.ico (网站图标)
     * - 其他可能添加到 public 文件夹下的静态资源
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};