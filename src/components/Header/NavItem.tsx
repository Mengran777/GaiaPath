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
  return (
    <a
      href={to}
      onClick={onClick}
      className={`px-5 py-2 rounded-full font-medium transition-all duration-300 ease-in-out cursor-pointer
                  ${
                    isActive
                      ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md transform -translate-y-1"
                      : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                  }`}
    >
      {label}
    </a>
  );
};

export default NavItem;
