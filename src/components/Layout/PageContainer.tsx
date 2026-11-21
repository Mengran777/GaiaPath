// src/components/Layout/PageContainer.tsx
"use client";

import React from "react";
import Header from "../Header/Header";

type AppStage = "initial" | "routes" | "details";

interface PageContainerProps {
  sidebar: React.ReactNode;
  mainContent: React.ReactNode;
  onLogout: () => void;
  username: string | null;
  stage: AppStage;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const PageContainer: React.FC<PageContainerProps> = ({
  sidebar,
  mainContent,
  onLogout,
  username,
  stage,
  activeTab = "Home",
  onTabChange,
}) => {
  const showSidebar = activeTab !== "Favorites" && stage !== "details";

  return (
    <div className="h-screen overflow-hidden bg-surface-dim text-ink flex flex-col">
      <Header onLogout={onLogout} username={username} activeTab={activeTab} onTabChange={onTabChange} />

      <main
        className={`flex-1 min-h-0 flex gap-4 p-4 lg:px-6 overflow-x-hidden ${
          activeTab === "Favorites" ? "overflow-y-auto items-start" : "overflow-hidden items-stretch"
        }`}
      >
        {showSidebar && stage === "initial" && (
          // First step of planning: the form is a centered card, not a full-width panel
          <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center justify-center py-6 animate-card-enter">
            {sidebar}
          </div>
        )}

        {showSidebar && stage !== "initial" && (
          <aside
            className="flex-shrink-0 overflow-hidden w-full md:w-[340px] lg:w-[380px]"
          >
            <div className="h-full flex flex-col overflow-hidden bg-surface border border-line rounded-xl">
              {sidebar}
            </div>
          </aside>
        )}

        <section
          className={`min-w-0 ${
            stage === "initial" && activeTab !== "Favorites" ? "hidden" : "flex-1"
          } ${activeTab === "Favorites" ? "w-full" : ""}`}
        >
          {mainContent}
        </section>
      </main>
    </div>
  );
};

export default PageContainer;
