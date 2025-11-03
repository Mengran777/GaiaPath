// src/components/Sidebar/SmartSearch.tsx (MODIFIED)

import React from "react";
import { Tag } from "../UI";
import Section from "../Layout/Section";

interface SmartSearchProps {
  onSearch: (query: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  query: string;
  setQuery: (query: string) => void;
}

const SmartSearch: React.FC<SmartSearchProps> = ({
  onSearch,
  onSuggestionClick,
  query,
  setQuery,
}) => {
  const suggestions = [
    "📸 Instagram-worthy spots",
    "🌅 Sunrise & sunset viewpoints",
    "🎭 Local festivals & events",
    "🏰 Medieval castles & fortresses",
    "🌃 Nightlife & entertainment",
    "🛍️ Shopping & local markets",
    "☕ Coffee culture tour",
    "🎬 Film locations & movie scenes",
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  const handleSearchClick = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <Section title="🔍 Tell Us About Your Dream Trip">
      <div className="relative mb-4">
        <textarea
          className="w-full p-4 pr-16 border-2 border-gray-200 rounded-xl font-medium text-gray-800
                     focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                     transition-all duration-300 bg-white shadow-sm hover:shadow-md resize-none"
          placeholder="Tell me what kind of trip you want in your own words...

Examples:
• I want to explore Greek culture and history, with some natural scenery and food spots
• I'd like to do hiking routes in the Lake District over 3 days
• Looking for a romantic getaway in Paris with art museums and fine dining"
          value={query}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) handleSearchClick();
          }}
          rows={6}
        />
        <button
          onClick={handleSearchClick}
          className="absolute right-4 bottom-4 bg-gradient-to-br from-blue-500 to-purple-500 text-white
                      p-3 rounded-lg shadow-md hover:scale-110 transition-transform duration-200 active:scale-95"
        >
          ✨
        </button>
      </div>
      
      <div className="text-xs text-gray-500 mb-3">
        💡 Tip: Be specific about what you want! Press Ctrl+Enter to search.
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((tag) => (
          <Tag
            key={tag}
            label={tag}
            isSelected={false}
            onClick={() => {
              setQuery(tag);
              onSuggestionClick(tag);
            }}
            className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 border border-blue-100 text-blue-700
                       hover:from-blue-100 hover:to-purple-100 hover:shadow-md active:scale-98"
          />
        ))}
      </div>
    </Section>
  );
};

export default SmartSearch;