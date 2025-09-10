// src/app/page.tsx
// 重要的：移除 "use client" 指令！让它成为默认的 Server Component

import App from "./App"; // 导入你的 App 组件

/**
 * 这是你的 Next.js 应用程序的主页面组件。
 * 在中间件处理认证和重定向后，这个组件将始终渲染 <App />。
 */
export default function HomePage() {
  // 这里的逻辑将在服务器端执行，不依赖客户端特有的 localStorage 或 window 对象
  // 因为认证重定向已由中间件处理，所以这里无需担心用户未认证的情况
  return <App />;
}
