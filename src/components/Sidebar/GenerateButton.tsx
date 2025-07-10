import React, { useState, useEffect } from "react";

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({
  onClick,
  isLoading,
}) => {
  const [buttonText, setButtonText] = useState("🚀 Generate My Itinerary");
  const [buttonBg, setButtonBg] = useState(
    "bg-gradient-to-br from-blue-600 to-purple-600"
  );

  useEffect(() => {
    if (isLoading) {
      setButtonText("🔄 Generating...");
      setButtonBg("bg-gradient-to-br from-green-500 to-emerald-500");
    } else {
      if (buttonText === "🔄 Generating...") {
        setButtonText("✅ Generation Complete");
        setButtonBg("bg-gradient-to-br from-green-600 to-emerald-600");
        const timer = setTimeout(() => {
          setButtonText("🚀 Generate My Itinerary");
          setButtonBg("bg-gradient-to-br from-blue-600 to-purple-600");
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, buttonText]);

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-full py-4 mt-6 rounded-xl text-white font-bold text-lg
                  transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl
                  ${buttonBg} ${
        isLoading
          ? "cursor-not-allowed opacity-80"
          : "hover:scale-[1.01] active:scale-98"
      }`}
    >
      {isLoading && buttonText === "🔄 Generating..." ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {buttonText}
        </span>
      ) : (
        buttonText
      )}
    </button>
  );
};

export default GenerateButton;
