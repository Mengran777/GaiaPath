import React from "react";
import { Input, Tag } from "../UI"; // Import from UI
import Section from "../Layout/Section"; // Import from Layout
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
    "Romantic Honeymoon",
    "Family Trip",
    "Food Tour",
    "History & Culture",
    "Nature Scenery",
    "Adventure Challenge",
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSearchClick = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <Section title="🔍 Smart Search">
      <div className="relative mb-4">
        <Input
          type="text"
          placeholder="Tell me what kind of trip you want... e.g., Beach hiking July Europe"
          value={query}
          onChange={handleInputChange}
          onKeyPress={(e) => {
            if (e.key === "Enter") handleSearchClick();
          }}
          className="pr-12"
        />
        <button
          onClick={handleSearchClick}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-br from-blue-500 to-purple-500 text-white
                      p-2 rounded-lg shadow-md hover:scale-110 transition-transform duration-200 active:scale-95"
        >
          ✨
        </button>
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
