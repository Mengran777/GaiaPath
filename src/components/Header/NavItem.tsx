import React from "react";

interface NavItemProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, isActive = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={isActive ? "page" : undefined}
    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-surface-dim text-ink" : "text-ink-muted hover:text-ink hover:bg-surface"
    }`}
  >
    {label}
  </button>
);

export default NavItem;
