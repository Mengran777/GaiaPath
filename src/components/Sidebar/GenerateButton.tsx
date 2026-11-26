import React from "react";
import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

// Sidebar action on the results page: rebuild routes from the edited preferences.
const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, isLoading }) => (
  <button type="button" onClick={onClick} disabled={isLoading} className="btn-ink w-full">
    {isLoading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
    {isLoading ? "Generating…" : "Regenerate"}
  </button>
);

export default GenerateButton;
