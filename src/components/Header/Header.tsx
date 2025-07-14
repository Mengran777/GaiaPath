"use client";

import React, { useState } from "react";
import NavItem from "./NavItem"; // Import NavItem

const Header: React.FC = () => {
  const [activeNav, setActiveNav] = useState("Discover");

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
      <div className="flex items-center space-x-3">
        <button
          className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-full p-2 pr-4
                           transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <img
            src="https://placehold.co/40x40/667eea/ffffff?text=U" // Placeholder for user avatar
            alt="User Avatar"
            className="w-10 h-10 rounded-full border-2 border-blue-300"
          />
          <span className="text-gray-700 text-base font-medium hidden sm:block">
            John Doe
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
