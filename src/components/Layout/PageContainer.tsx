"use client"; // This is a client component

import React from "react";
import Header from "../Header/Header"; // Import Header

interface PageContainerProps {
  sidebar: React.ReactNode;
  mainContent: React.ReactNode;
  onLogout: () => void; // FIX: Add onLogout prop
  currentUserId: string | null; // FIX: Add currentUserId prop
  pathname: string; // FIX: Add pathname prop
}

const PageContainer: React.FC<PageContainerProps> = ({
  sidebar,
  mainContent,
  onLogout, // FIX: Destructure onLogout
  currentUserId, // FIX: Destructure currentUserId
  pathname, // FIX: Destructure pathname
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans text-gray-900 antialiased flex flex-col">
      {/* FIX: Pass onLogout, currentUserId, and pathname to Header */}
      <Header
        onLogout={onLogout}
        currentUserId={currentUserId}
        pathname={pathname}
      />
      <main className="flex-1 container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 flex-shrink-0 flex flex-col">
          {sidebar}
        </aside>
        <section className="lg:col-span-2 min-w-0 flex flex-col gap-6">
          {mainContent}
        </section>
      </main>
    </div>
  );
};

export default PageContainer;
