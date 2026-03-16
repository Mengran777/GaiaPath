import React from "react";

interface TypeCardProps {
  label: string;
  icon: string;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

const TypeCard: React.FC<TypeCardProps> = ({
  label,
  icon,
  isSelected,
  onClick,
  className = "",
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 border-2 rounded-xl text-center cursor-pointer
transition-all duration-300 ease-in-out bg-white
                  ${
                    isSelected
                      ? "border-[#1a6b5e] bg-[#f0faf8] shadow-md transform -translate-y-1"
                      : "border-gray-200 hover:border-[#2d9e8a] hover:shadow-sm"
                  }
                  ${className}`}
    >
      <div className={`text-3xl mb-2 ${isSelected ? "text-[#0d3d38]" : ""}`}>
        {icon}
      </div>
      <div
        className={`font-medium ${
          isSelected ? "text-[#0d3d38]" : "text-gray-700"
        }`}
      >
        {label}
      </div>
    </div>
  );
};

export default TypeCard;
