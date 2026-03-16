import React from "react";

interface NavItemProps {
  label: string;
  to: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  label,
  to,
  isActive = false,
  onClick,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Prevent default link navigation
    if (onClick) {
      onClick();
    }
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer
                  ${
                    isActive
                      ? "bg-[#0d3d38] text-white"
                      : "text-[#4a4a4a] hover:bg-[#f0ede8] hover:text-[#0d3d38]"
                  }`}
    >
      {label}
    </a>
  );
};

export default NavItem;
