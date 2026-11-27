// src/components/Layout/PageContainer.tsx
"use client";

import React from "react";
import Header from "../Header/Header";
import { useScrollFade } from "@/lib/useScrollFade";

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
  // The itinerary page scrolls as a whole on wide screens (the header scrolls away;
  // every other view keeps a fixed-height layout
  const pageScroll = stage === "details" && activeTab !== "Favorites";
  const wizardScrollRef = useScrollFade<HTMLDivElement>();

  return (
    <div className={`h-screen overflow-hidden bg-white text-ink flex flex-col ${pageScroll ? "md:h-auto md:min-h-screen md:overflow-visible" : ""}`}>
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
        } ${pageScroll ? "md:overflow-visible md:overflow-x-clip" : ""}`}
      >
        {showSidebar && stage === "initial" && (
          // First step of planning: the wizard fills the page, centered on white
          <div ref={wizardScrollRef} className="w-full h-full overflow-y-auto scroll-fade flex flex-col animate-card-enter">
            <div className="my-auto pt-6">{sidebar}</div>
          </div>
        )}

        {showSidebar && stage !== "initial" && (
          // Phones show the route list alone (Plan in the header changes the trip);
          // side by side, the sidebar would leave the list no width at all
          <aside className="hidden md:block flex-shrink-0 overflow-hidden md:w-[300px] lg:w-[320px]">
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
