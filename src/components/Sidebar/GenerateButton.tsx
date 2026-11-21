import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, isLoading }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="w-full h-12 rounded-lg bg-brand-900 text-white font-semibold text-[15px]
               flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors
               focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
               disabled:opacity-70 disabled:cursor-not-allowed"
  >
    {isLoading ? (
      <>
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        Generating…
      </>
    ) : (
      <>
        Generate itinerary
        <ArrowRight size={18} aria-hidden="true" />
      </>
    )}
  </button>
);

export default GenerateButton;
