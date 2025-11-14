// src/components/Sidebar/SmartSearch.tsx (MODIFIED)

import React, { useState, useEffect } from "react";
import { Tag } from "../UI";
import Section from "../Layout/Section";

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
    "📸 Instagram-worthy spots",
    "🌅 Sunrise & sunset viewpoints",
    "🎭 Local festivals & events",
    "🏰 Medieval castles & fortresses",
    "🌃 Nightlife & entertainment",
    "🛍️ Shopping & local markets",
    "☕ Coffee culture tour",
    "🎬 Film locations & movie scenes",
  ];

  // 管理选中的标签
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  const handleSearchClick = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  // 处理键盘事件，支持删除标签
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter 触发搜索
    if (e.key === "Enter" && e.ctrlKey) {
      handleSearchClick();
      return;
    }

    // Backspace 键删除标签
    if (e.key === "Backspace" && selectedTags.size > 0) {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const text = textarea.value;

      // 检查光标是否在文本末尾
      const isAtEnd = cursorPosition === text.length;

      // 如果光标在末尾，删除最后一个标签
      if (isAtEnd) {
        e.preventDefault();
        const tagsArray = Array.from(selectedTags);
        const lastTag = tagsArray[tagsArray.length - 1];

        setSelectedTags((prev) => {
          const newSelected = new Set(prev);
          newSelected.delete(lastTag);
          return newSelected;
        });
      }
    }
  };

  // 处理标签点击
  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(tag)) {
        newSelected.delete(tag);
      } else {
        newSelected.add(tag);
      }
      return newSelected;
    });
  };

  // 当选中的标签变化时，更新查询文本
  useEffect(() => {
    if (selectedTags.size > 0) {
      const tagsList = Array.from(selectedTags).join(", ");
      setQuery(`I want to visit places with: ${tagsList}`);
    } else {
      // 当所有标签都被删除时，清空查询文本
      setQuery("");
    }
  }, [selectedTags, setQuery]);

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
          onKeyDown={handleKeyDown}
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
        💡 Tip: Click tags to select multiple interests! Press Backspace to remove last tag.
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((tag) => (
          <Tag
            key={tag}
            label={tag}
            isSelected={selectedTags.has(tag)}
            onClick={() => handleTagClick(tag)}
            className={
              selectedTags.has(tag)
                ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white border-blue-500 shadow-lg hover:shadow-xl"
                : "bg-gradient-to-br from-blue-50/50 to-purple-50/50 border border-blue-100 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md"
            }
          />
        ))}
      </div>
    </Section>
  );
};

export default SmartSearch;