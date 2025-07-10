import React from "react";

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = "",
  ...props
}) => {
  return (
    <input
      className={`w-full p-3 border-2 border-gray-200 rounded-xl font-medium text-gray-800
                  focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                  transition-all duration-300 bg-white shadow-sm hover:shadow-md ${className}`}
      {...props}
    />
  );
};

export default Input;
