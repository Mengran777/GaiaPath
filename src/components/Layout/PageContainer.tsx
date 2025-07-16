import React from "react";

interface PageContainerProps {
  sidebar: React.ReactNode;
  mainContent: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({
  sidebar,
  mainContent,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans text-gray-900 antialiased flex flex-col">
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
