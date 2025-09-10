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
                      ? "border-blue-500 bg-blue-100 shadow-md transform -translate-y-1"
                      : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                  }
                  ${className}`}
    >
      <div className={`text-3xl mb-2 ${isSelected ? "text-blue-600" : ""}`}>
        {icon}
      </div>
      <div
        className={`font-medium ${
          isSelected ? "text-blue-600" : "text-gray-700"
        }`}
      >
        {label}
      </div>
    </div>
  );
};

export default TypeCard;
