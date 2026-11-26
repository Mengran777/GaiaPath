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
  isGuest?: boolean;
  onAuthNavigate?: (path: "/auth/login" | "/auth/register") => void;
}

const PageContainer: React.FC<PageContainerProps> = ({
  sidebar,
  mainContent,
  onLogout,
  username,
  stage,
  activeTab = "Home",
  onTabChange,
  isGuest = false,
  onAuthNavigate,
}) => {
  const showSidebar = activeTab !== "Favorites" && stage !== "details";

  return (
    <div className="h-screen overflow-hidden bg-white text-ink flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:bg-ink focus:text-white focus:px-4 focus:py-2 focus:text-[13px]"
      >
        Skip to content
      </a>
      <Header
        onLogout={onLogout}
        username={username}
        activeTab={activeTab}
        onTabChange={onTabChange}
        isGuest={isGuest}
        onAuthNavigate={onAuthNavigate}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className={`focus:outline-none flex-1 min-h-0 flex gap-10 px-5 pb-6 lg:px-12 overflow-x-hidden ${
          activeTab === "Favorites" ? "overflow-y-auto items-start" : "overflow-hidden items-stretch"
        }`}
      >
        {showSidebar && stage === "initial" && (
          // First step of planning: the wizard fills the page, centered on white
          <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col animate-card-enter">
            <div className="my-auto pt-6">{sidebar}</div>
          </div>
        )}

        {showSidebar && stage !== "initial" && (
          <aside className="flex-shrink-0 overflow-hidden w-full md:w-[300px] lg:w-[320px]">
            <div className="h-full flex flex-col overflow-hidden bg-white">{sidebar}</div>
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
