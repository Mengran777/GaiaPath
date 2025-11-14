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
  activeTab = "Discover",
  onTabChange,
}) => {
  return (
    <div className="h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans text-gray-900 antialiased flex flex-col">
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
        className={`flex-1 py-6 flex gap-6
              ${stage === "initial" ? "overflow-y-auto pl-4 lg:pl-8 pr-0 items-start" : "overflow-hidden pl-4 lg:pl-8 pr-0 items-stretch"}
              `}
      >
        {/* Sidebar - Changes width based on stage */}
        <aside
          className={`
            flex-shrink-0 transition-all duration-800 ease-in-out
            ${stage === "initial" ? "w-full" : ""}
            ${stage === "routes" ? "w-full lg:w-[35%]" : ""}
            ${stage === "details" ? "w-16" : ""}
          `}
        >
          <div
            className={`
              bg-white shadow-xl h-full flex flex-col
              transition-all duration-800 ease-in-out overflow-hidden
              ${stage === "initial" ? "rounded-2xl" : "rounded-l-2xl"}
              ${stage === "details" ? "p-4 items-center justify-start" : ""}
            `}
          >
            {stage === "details" ? (
              // Minimized view in stage 3
              <div className="writing-mode-vertical text-blue-600 font-bold text-sm">
                {sidebar}
              </div>
            ) : (
              // Full view in stages 1 & 2
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-0 pl-6 pt-6 pb-6">
                {sidebar}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content - Changes based on stage */}
        <section
          className={`
            min-w-0 transition-all duration-800 ease-in-out
            ${stage === "initial" ? "hidden" : ""}
            ${stage === "routes" ? "flex-1" : ""}
            ${stage === "details" ? "flex-1" : ""}
          `}
        >
          {mainContent}
        </section>
      </main>
    </div>
  );
};

export default PageContainer;
