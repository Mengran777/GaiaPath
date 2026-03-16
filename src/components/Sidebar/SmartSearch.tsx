import React, { useState, useEffect } from "react";

interface SmartSearchProps {
  onSearch: (query: string) => void;
  query: string;
  setQuery: (query: string) => void;
}

const SmartSearch: React.FC<SmartSearchProps> = ({
  onSearch,
  query,
  setQuery,
}) => {
  const suggestions = [
    { emoji: "📸", label: "Instagram spots" },
    { emoji: "🌅", label: "Sunrise views" },
    { emoji: "🏰", label: "Historic sites" },
    { emoji: "☕", label: "Coffee culture" },
    { emoji: "🎭", label: "Local festivals" },
    { emoji: "🛒", label: "Local markets" },
    { emoji: "🎬", label: "Film locations" },
  ];

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      if (query.trim()) onSearch(query);
      return;
    }
    if (e.key === "Backspace" && selectedTags.size > 0) {
      const cursorPosition = e.currentTarget.selectionStart;
      if (cursorPosition === e.currentTarget.value.length) {
        e.preventDefault();
        const tagsArray = Array.from(selectedTags);
        const lastTag = tagsArray[tagsArray.length - 1];
        setSelectedTags((prev) => {
          const next = new Set(prev);
          next.delete(lastTag);
          return next;
        });
      }
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  useEffect(() => {
    if (selectedTags.size > 0) {
      setQuery(`I want to visit places with: ${Array.from(selectedTags).join(", ")}`);
    } else {
      setQuery("");
    }
  }, [selectedTags, setQuery]);

  return (
    <div className="bg-white rounded-2xl border border-[#e2ddd8] overflow-hidden mb-5">
      {/* Section label */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-[#8a8a8a]">
          YOUR VISION
        </p>
      </div>

      {/* Textarea */}
      <textarea
        id="smart-search-textarea"
        className="w-full px-4 py-3 border-b border-[#e2ddd8] text-[13px] text-[#1a1a1a]
                   placeholder:text-[#8a8a8a] resize-none focus:outline-none bg-white"
        placeholder={"Describe your ideal trip in your own words...\ne.g. Greek islands with local food and some hiking"}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        rows={3}
      />

      {/* Hint */}
      <p className="px-4 pt-2 text-[10.5px] text-[#8a8a8a]">
        💡 Or pick from quick tags below
      </p>

      {/* Tags */}
      <div className="px-4 pb-3 pt-2 flex flex-wrap gap-1.5">
        {suggestions.map(({ emoji, label }) => {
          const tag = `${emoji} ${label}`;
          const isSelected = selectedTags.has(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-[#0d3d38] text-white"
                  : "bg-[#f0ede8] text-[#4a4a4a] hover:bg-[#e5e1db]"
              }`}
            >
              {emoji} {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SmartSearch;
