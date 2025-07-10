"use client";

import React from "react";

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Section: React.FC<SectionProps> = ({
  title,
  children,
  className = "",
}) => {
  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-xl backdrop-blur-md bg-opacity-95 ${className}`}
    >
      {title && (
        <h2 className="text-2xl font-bold mb-5 text-gray-800">{title}</h2>
      )}
      {children}
    </div>
  );
};

export default Section;
