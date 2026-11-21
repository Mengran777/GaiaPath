// src/components/Header/Header.tsx
"use client";

import React from "react";
import { LogOut } from "lucide-react";
import NavItem from "./NavItem";
import Logo from "../UI/Logo";

const TABS = ["Home", "My Itineraries", "Favorites"] as const;

interface HeaderProps {
  onLogout: () => void;
  username: string | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, username, activeTab = "Home", onTabChange }) => {
  const initial = username?.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="bg-white border-b border-line px-4 lg:px-8 h-16 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-8 min-w-0">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Main">
          {TABS.map((tab) => (
            <NavItem
              key={tab}
              label={tab}
              isActive={activeTab === tab}
              onClick={() => onTabChange?.(tab)}
            />
          ))}
        </nav>
      </div>

      {username && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 text-sm font-semibold flex items-center justify-center"
            aria-hidden="true"
          >
            {initial}
          </span>
          <span className="hidden sm:block text-sm font-medium text-ink">{username}</span>
          <span className="hidden sm:block w-px h-5 bg-line" aria-hidden="true" />
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
