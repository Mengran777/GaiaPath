import React, { useState, useEffect, useRef } from "react";

interface LocationSuggestion {
  name: string;
  displayName: string;
  country: string;
  lat: number;
  lon: number;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "e.g., Paris, France",
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 使用 Nominatim API (OpenStreetMap) 获取地理位置建议
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.trim().length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);

      try {
        // 使用 Nominatim API (免费，无需 API key)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(value)}&` +
          `limit=8&` +
          `addressdetails=1`,
          {
            headers: {
              "Accept": "application/json",
              "User-Agent": "GaiaPath-TravelApp/1.0", // Nominatim 要求提供 User-Agent
            },
          }
        );

        if (!response.ok) {
          console.error("Failed to fetch location suggestions");
          return;
        }

        const data = await response.json();

        // 转换为我们的格式
        const formattedSuggestions: LocationSuggestion[] = data
          .filter((item: any) => {
            // 只保留城市、国家、州等主要地点
            const type = item.type;
            return [
              "city",
              "town",
              "village",
              "country",
              "state",
              "administrative",
              "municipality",
            ].includes(type) || item.class === "place";
          })
          .map((item: any) => {
            const address = item.address || {};
            const name = item.name || item.display_name.split(",")[0];
            const country = address.country || "";
            const state = address.state || "";

            let displayName = name;
            if (state && state !== name) {
              displayName += `, ${state}`;
            }
            if (country && country !== name) {
              displayName += `, ${country}`;
            }

            return {
              name: item.name || item.display_name.split(",")[0],
              displayName: displayName,
              country: country,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
            };
          })
          .slice(0, 6); // 限制显示 6 个结果

        setSuggestions(formattedSuggestions);
        setShowDropdown(formattedSuggestions.length > 0);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // 添加防抖
    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                   transition-all duration-300 outline-none text-gray-800"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
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
          </div>
        )}
      </div>

      {/* 下拉建议列表 */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`suggestion-${index}-${suggestion.lat}-${suggestion.lon}-${suggestion.displayName}`}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-4 py-3 transition-colors duration-150
                ${
                  index === highlightedIndex
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : "hover:bg-gray-50 border-l-4 border-transparent"
                }
                ${index !== suggestions.length - 1 ? "border-b border-gray-100" : ""}
              `}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📍</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    {suggestion.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {suggestion.displayName}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 无结果提示 */}
      {showDropdown && !isLoading && value.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 px-4 py-3">
          <div className="text-center text-gray-500">
            <span className="text-2xl block mb-1">🔍</span>
            No locations found
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
