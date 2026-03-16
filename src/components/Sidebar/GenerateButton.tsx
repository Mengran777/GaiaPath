import React from "react";

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, isLoading }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-full py-4 rounded-2xl text-white font-semibold text-[15px]
                  bg-gradient-to-r from-[#0d3d38] to-[#1a6b5e]
                  flex items-center justify-center gap-2
                  transition-all duration-200 shadow-md
                  ${isLoading
                    ? "cursor-not-allowed opacity-80"
                    : "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                  }`}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-5 w-5 text-white flex-shrink-0"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Generating...
        </>
      ) : (
        <>
          ✨ Generate My Itinerary
          <span className="text-white/50 text-xs font-normal">· ~30s</span>
        </>
      )}
    </button>
  );
};

export default GenerateButton;
