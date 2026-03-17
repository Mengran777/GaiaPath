// src/components/Layout/PageContainer.tsx (MODIFIED)
"use client";

import React from "react";
import Header from "../Header/Header";

type AppStage = "initial" | "routes" | "details";

interface PageContainerProps {
  sidebar: React.ReactNode;
  mainContent: React.ReactNode;
  onLogout: () => void;
  currentUserId: string | null;
  pathname: string;
  stage: AppStage;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const PageContainer: React.FC<PageContainerProps> = ({
  sidebar,
  mainContent,
  onLogout,
  currentUserId,
  pathname,
  stage,
  activeTab = "Home",
  onTabChange,
}) => {
  return (
    <div className="h-screen bg-[#0a1a17] font-sans text-gray-900 antialiased flex flex-col">
      {/* Header */}
      <Header
        onLogout={onLogout}
        currentUserId={currentUserId}
        pathname={pathname}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 flex gap-6 overflow-x-hidden
              ${activeTab === "Favorites" ? "py-6 px-4 lg:px-8 overflow-y-auto items-start" : ""}
              ${activeTab !== "Favorites" ? "py-6 pl-4 lg:pl-8 pr-4 lg:pr-6 overflow-hidden items-stretch" : ""}
              `}
      >
        {/* Sidebar - Hidden on Favorites tab and details stage */}
        {activeTab !== "Favorites" && stage !== "details" && (
          <aside
            className={`
              flex-shrink-0 transition-all duration-700 ease-in-out overflow-hidden
              ${stage === "initial" ? "w-full" : ""}
              ${stage === "routes" ? "w-[35%]" : ""}
            `}
          >
            <div
              className={`
                bg-[#f5f2ee] shadow-lg h-full flex flex-col overflow-hidden
                ${stage === "initial" ? "rounded-2xl" : "rounded-l-2xl"}
              `}
            >
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-0 pl-6 pt-6 pb-6">
                {sidebar}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content - Hidden in initial stage, visible in routes/details */}
        <section
          className={`
            min-w-0 transition-all duration-700 ease-in-out
            ${stage === "initial" ? "w-0 opacity-0 overflow-hidden pointer-events-none" : ""}
            ${stage === "routes" ? "flex-1 opacity-100" : ""}
            ${stage === "details" ? "flex-1 opacity-100" : ""}
            ${activeTab === "Favorites" ? "w-full opacity-100" : ""}
          `}
        >
          {mainContent}
        </section>
      </main>
    </div>
  );
};

export default PageContainer;
