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
      className={`p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer
                  transition-all duration-300 ease-in-out bg-white
                  ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/50 shadow-md transform -translate-y-1"
                      : "hover:border-blue-300 hover:shadow-sm"
                  }
                  ${className}`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="font-medium text-gray-700">{label}</div>
    </div>
  );
};

export default TypeCard;
