// src/components/Layout/PageContainer.tsx
"use client";

import React from "react";
import Header from "../Header/Header";

interface PageContainerProps {
  sidebar: React.ReactNode;
  mainContent: React.ReactNode;
  onLogout: () => void;
  currentUserId: string | null;
  pathname: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  sidebar,
  mainContent,
  onLogout,
  currentUserId,
  pathname,
}) => {
  return (
    // ⭐ 关键修改：使用 h-screen 和 flex-col 让整个页面占据一屏并垂直布局 ⭐
    <div className="h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans text-gray-900 antialiased flex flex-col">
      {/* 头部是固定的 */}
      <Header
        onLogout={onLogout}
        currentUserId={currentUserId}
        pathname={pathname}
      />

      {/* ⭐ 关键修改：主内容区域占据所有剩余空间并处理自己的滚动 ⭐ */}
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0 flex flex-col">
          {/* ⭐ 关键修改：侧边栏容器本身是 h-full，内部flex-col ⭐ */}
          <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
            {/* 侧边栏内容滚动容器，flex-1 填充，p-6 添加内边距 */}
            <div className="flex-1 overflow-y-auto p-6">{sidebar}</div>
          </div>
        </aside>

        {/* Main Content */}
        {/* ⭐ 关键修改：Main Content 区域占据剩余空间并可滚动 ⭐ */}
        <section className="w-full lg:w-2/3 xl:w-3/4 min-w-0 flex flex-col gap-6 h-full">
          {/* Main Content 容器现在也有 h-full，这样子元素才能正确计算高度 */}
          {mainContent}
        </section>
      </main>
    </div>
  );
};

export default PageContainer;
