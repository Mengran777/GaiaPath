// src/components/Header/Header.tsx
"use client";

import React from "react";
import NavItem from "./NavItem";
import Logo from "../UI/Logo";

// Tab ids stay as the app uses them; labels are the editorial names shown.
const TABS: { id: string; label: string }[] = [
  { id: "Home", label: "Plan" },
  { id: "My Itineraries", label: "Itineraries" },
  { id: "Favorites", label: "Saved" },
];

interface HeaderProps {
  onLogout: () => void;
  username: string | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  /** Signed out: show Log in / Create account instead of the user */
  isGuest?: boolean;
  onAuthNavigate?: (path: "/auth/login" | "/auth/register") => void;
}

const Header: React.FC<HeaderProps> = ({
  onLogout,
  username,
  activeTab = "Home",
  onTabChange,
  isGuest = false,
  onAuthNavigate,
}) => (
  <header className="bg-white px-5 lg:px-12 h-[72px] flex items-center justify-between gap-6 flex-shrink-0">
    <button
      type="button"
      onClick={() => onTabChange?.("Home")}
      aria-label="Gaia, back to planning"
      className="transition-opacity duration-500 hover:opacity-60"
    >
      <Logo />
    </button>
    <div className="flex items-center gap-4 sm:gap-7 min-w-0 whitespace-nowrap">
      <nav className="flex items-center gap-4 sm:gap-7" aria-label="Main">
        {TABS.map((tab) => (
          <NavItem
            key={tab.id}
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange?.(tab.id)}
          />
        ))}
      </nav>
      {isGuest && (
        <>
          <span className="hidden sm:block w-px h-4 bg-line" aria-hidden="true" />
          <button type="button" onClick={() => onAuthNavigate?.("/auth/login")} className="link-quiet text-[13px]">
            Log in
          </button>
          {/* Phones: Log in only (the log-in page links to sign up) */}
          <button
            type="button"
            onClick={() => onAuthNavigate?.("/auth/register")}
            className="hidden sm:block text-[13px] text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink transition-colors"
          >
            Create account
          </button>
        </>
      )}
      {username && (
        <>
          <span className="hidden sm:block w-px h-4 bg-line" aria-hidden="true" />
          <span className="hidden sm:block text-[13px] text-ink-muted truncate max-w-[160px]">{username}</span>
          <button type="button" onClick={onLogout} className="link-quiet text-[13px]">
            Log out
          </button>
        </>
      )}
    </div>
  </header>
);

export default Header;
