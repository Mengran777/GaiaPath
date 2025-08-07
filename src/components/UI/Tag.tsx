import React from "react";

interface TagProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const Tag: React.FC<TagProps> = ({
  label,
  isSelected,
  onClick,
  className = "",
  icon,
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-in-out
                  flex items-center justify-center gap-2
                  ${
                    isSelected
                      ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg transform scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
                  } ${className}`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {label}
    </button>
  );
};

export default Tag;
