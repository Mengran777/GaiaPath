// src/components/Header/Header.tsx
"use client"; // This is a client component

import React, { useState } from "react";
import NavItem from "./NavItem"; // Import NavItem

interface HeaderProps {
  onLogout: () => void;
  currentUserId: string | null; // This prop will now receive either the User ID OR the Username
  pathname?: string;
}

const Header: React.FC<HeaderProps> = ({
  onLogout,
  currentUserId,
  pathname,
}) => {
  const [activeNav, setActiveNav] = useState("Discover");

  const isOnAuthPage = pathname?.startsWith("/auth") || false;
  console.log("Header Render - currentUserId:", currentUserId); // This will show "Mona" on the later renders
  console.log("Header Render - isOnAuthPage:", isOnAuthPage);
  console.log(
    "Header Render - Should show user info:",
    currentUserId && !isOnAuthPage
  );

  return (
    <header
      className="bg-white bg-opacity-95 backdrop-blur-md shadow-lg py-4 px-8 rounded-b-2xl
                   flex flex-col md:flex-row justify-between items-center gap-4"
    >
      <div className="flex items-center space-x-4">
        <div className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2">
          <span>🌍</span>
          Gaia
        </div>
        <nav className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4">
          <NavItem
            label="Discover"
            to="#"
            isActive={activeNav === "Discover"}
            onClick={() => setActiveNav("Discover")}
          />
          <NavItem
            label="My Itineraries"
            to="#"
            isActive={activeNav === "My Itineraries"}
            onClick={() => setActiveNav("My Itineraries")}
          />
          <NavItem
            label="Favorites"
            to="#"
            isActive={activeNav === "Favorites"}
            onClick={() => setActiveNav("Favorites")}
          />
          <NavItem
            label="Community"
            to="#"
            isActive={activeNav === "Community"}
            onClick={() => setActiveNav("Community")}
          />
        </nav>
      </div>

      {currentUserId && !isOnAuthPage ? (
        <div className="flex items-center space-x-3">
          {/* REMOVED: User ID: {currentUserId.substring(0, 8)}... */}
          {/* REPLACED with a clear welcome message using the full currentUserId (which is now the username) */}
          <span className="text-gray-700 text-base font-medium">
            Welcome, {currentUserId}!{" "}
            {/* This will now correctly show "Welcome, Mona!" */}
          </span>

          <button
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-full p-2 pr-4
                         transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <img
              src="https://placehold.co/40x40/667eea/ffffff?text=U" // Placeholder for user avatar
              alt="User Avatar"
              className="w-10 h-10 rounded-full border-2 border-blue-300"
            />
            {/* You had `currentUserId` here as well, let's keep it simple for now as 'Welcome, [Username]' is enough */}
            {/* If you want to show username here too, just use currentUserId again */}
            {/* <span className="text-gray-700 text-base font-medium hidden sm:block">
              {currentUserId}
            </span> */}
          </button>
          {/* Using a simple button here. If you have shadcn/ui Button, use that. */}
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors duration-200" // Fallback styles
          >
            Logout
          </button>
        </div>
      ) : null}
    </header>
  );
};

export default Header;
