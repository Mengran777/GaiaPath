import React from "react";

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <select
      className={`w-full p-3 border-2 border-gray-200 rounded-xl font-medium text-gray-800 bg-white
                  appearance-none pr-8 cursor-pointer shadow-sm hover:shadow-md
                  focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                  transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export default Select;
