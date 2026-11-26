import React, { useState, useEffect } from "react";

interface SmartSearchProps {
  onSearch: (query: string) => void;
  query: string;
  setQuery: (query: string) => void;
}

// Results-page sidebar: the free-text "anything else" note sent with the
// request. (The quick-tag pills were dropped to keep the sidebar short.)
const SmartSearch: React.FC<SmartSearchProps> = ({ onSearch, query, setQuery }) => {
  const [typedText, setTypedText] = useState(query);

  useEffect(() => {
    setQuery(typedText.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedText]);

  return (
    <div className="mb-6">
      <label htmlFor="smart-search-textarea" className="eyebrow block">Anything else</label>
      <textarea
        id="smart-search-textarea"
        className="field-line text-[14px] resize-none"
        placeholder="Sunrise hikes, long lunches, no museums"
        value={typedText}
        onChange={(e) => setTypedText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey && typedText.trim()) onSearch(typedText.trim());
        }}
        rows={2}
      />
    </div>
  );
};

export default SmartSearch;
