import React, { useState, useEffect } from "react";

interface SmartSearchProps {
  onSearch: (query: string) => void;
  query: string;
  setQuery: (query: string) => void;
}

const TAG_PREFIX = "I want to visit places with: ";

function buildCombinedQuery(typedText: string, selectedTags: Set<string>): string {
  const trimmed = typedText.trim();
  if (selectedTags.size === 0) return trimmed;
  const tagsClause = `${TAG_PREFIX}${Array.from(selectedTags).join(", ")}`;
  return trimmed ? `${trimmed}. ${tagsClause}` : tagsClause;
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

  // Textarea shows only what the user typed; tags merge in separately so
  // toggling one never overwrites hand-typed text.
  const [typedText, setTypedText] = useState(query);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    setQuery(buildCombinedQuery(typedText, selectedTags));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedText, selectedTags]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTypedText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      const combined = buildCombinedQuery(typedText, selectedTags);
      if (combined.trim()) onSearch(combined);
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

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
        value={typedText}
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
