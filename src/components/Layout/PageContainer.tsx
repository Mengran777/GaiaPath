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
}

const PageContainer: React.FC<PageContainerProps> = ({
  sidebar,
  mainContent,
  onLogout,
  currentUserId,
  pathname,
  stage,
}) => {
  return (
    <div className="h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans text-gray-900 antialiased flex flex-col">
      {/* Header */}
      <Header
        onLogout={onLogout}
        currentUserId={currentUserId}
        pathname={pathname}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 container mx-auto px-4 lg:px-8 py-6 flex gap-6
              ${stage === "initial" ? "overflow-y-auto" : "overflow-hidden"}
              ${
                stage === "initial"
                  ? "items-start justify-center"
                  : "items-stretch"
              }`}
      >
        {/* Sidebar - Changes width based on stage */}
        <aside
          className={`
            flex-shrink-0 transition-all duration-800 ease-in-out
            ${stage === "initial" ? "w-full max-w-2xl" : ""}
            ${stage === "routes" ? "w-full lg:w-[35%]" : ""}
            ${stage === "details" ? "w-16" : ""}
          `}
        >
          <div
            className={`
              bg-white rounded-2xl shadow-xl h-full flex flex-col
              transition-all duration-800 ease-in-out
              ${stage === "details" ? "p-4 items-center justify-start" : "p-6"}
            `}
          >
            {stage === "details" ? (
              // Minimized view in stage 3
              <div className="writing-mode-vertical text-blue-600 font-bold text-sm">
                {sidebar}
              </div>
            ) : (
              // Full view in stages 1 & 2
              <div className="flex-1 overflow-y-auto custom-scrollbar">
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
