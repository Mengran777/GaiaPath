// src/components/Layout/PageContainer.tsx
"use client"; // This is a client component

import React from "react";
import Header from "../Header/Header"; // Import Header

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
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans text-gray-900 antialiased flex flex-col">
      <Header
        onLogout={onLogout}
        currentUserId={currentUserId}
        pathname={pathname}
      />
      {/* Enhanced responsive layout */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0 flex flex-col">
          <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            {sidebar}
          </div>
        </aside>

        {/* Main Content */}
        <section className="w-full lg:w-2/3 xl:w-3/4 min-w-0 flex flex-col gap-6">
          {mainContent}
        </section>
      </main>
    </div>
  );
};

export default PageContainer;
