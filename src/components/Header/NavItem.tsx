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
    e.preventDefault(); // 阻止默认的链接跳转行为
    if (onClick) {
      onClick();
    }
  };

  return (
    <a
      href={to}
      onClick={handleClick}
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
