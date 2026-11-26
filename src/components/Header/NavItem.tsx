import React from "react";

interface NavItemProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

// Current page is full black; the others rest at 60% and darken on hover.
const NavItem: React.FC<NavItemProps> = ({ label, isActive = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={isActive ? "page" : undefined}
    className={`py-1 text-[13px] text-ink transition-opacity duration-500 ${
      isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
    }`}
  >
    {label}
  </button>
);

export default NavItem;
