// src/components/MainPanel/ItineraryPanel.tsx (MODIFIED)

import React, { useState, useEffect, useRef } from "react";
import ItineraryCard from "./ItineraryCard";
import { DayItinerary } from "../../types/itinerary";
import { FavoriteButton } from "../UI";

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
}

interface ItineraryPanelProps {
  itinerary: DayItinerary[];
  onActivityClick: (location: Location) => void;
  onDayClick?: (dayNumber: number) => void; // ⭐ NEW: Day click handler
  highlightedDay?: number | null; // ⭐ NEW: Currently highlighted day
  routeId?: string; // ⭐ NEW: Route ID for favorite
  isFavorite?: boolean; // ⭐ NEW: Is this route favorited
  onToggleFavorite?: () => void; // ⭐ NEW: Toggle favorite handler
}

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  itinerary,
  onActivityClick,
  onDayClick,
  highlightedDay = null,
  routeId,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [weatherData, setWeatherData] = useState<{ [key: string]: string }>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Simulate weather update
  useEffect(() => {
    if (!itinerary || itinerary.length === 0) {
      setWeatherData({});
      return;
    }

    const updateWeather = () => {
      const weatherOptions = [
        "Sunny",
        "Partly Cloudy",
        "Light Rain",
        "Overcast",
      ];
      const tempOptions = ["25°C", "26°C", "27°C", "28°C", "29°C", "30°C"];
      const newWeatherData: { [key: string]: string } = {};

      itinerary.forEach((day) => {
        const randomWeather =
          weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
        const randomTemp =
          tempOptions[Math.floor(Math.random() * tempOptions.length)];
        newWeatherData[day.date] = `${randomWeather} ${randomTemp}`;
      });
      setWeatherData(newWeatherData);
    };

    updateWeather();
    const interval = setInterval(updateWeather, 30000);
    return () => clearInterval(interval);
  }, [itinerary]);

  // Fade-in animation
  useEffect(() => {
    if (!itinerary || itinerary.length === 0) return;

    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = "1";
          (entry.target as HTMLElement).style.transform = "translateY(0)";
        }
      });
    }, observerOptions);

    if (panelRef.current) {
      const dayElements = panelRef.current.querySelectorAll(
        ".itinerary-day-animated"
      );
      dayElements.forEach((el) => {
        (el as HTMLElement).style.opacity = "0";
        (el as HTMLElement).style.transform = "translateY(30px)";
        observer.observe(el);
      });
    }

    return () => {
      if (panelRef.current) {
        const dayElements = panelRef.current.querySelectorAll(
          ".itinerary-day-animated"
        );
        dayElements.forEach((el) => observer.unobserve(el));
      }
    };
  }, [itinerary]);

  // ⭐ Handle day click
  const handleDayClick = (dayNumber: number) => {
    if (onDayClick) {
      onDayClick(dayNumber);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        className="mb-6 pb-4 border-b-2 border-gray-100 relative cursor-pointer hover:bg-gray-50 rounded-lg p-4 -mx-4 transition-colors duration-200"
        onClick={() => onDayClick && onDayClick(0)}
      >
        {/* 收藏按钮 */}
        {onToggleFavorite && (
          <div
            className="absolute top-4 right-4"
            onClick={(e) => e.stopPropagation()}
          >
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
              size="large"
            />
          </div>
        )}

        <h2 className="text-3xl font-bold text-gray-800 mb-2 pr-16">
          Your Personalized Itinerary
        </h2>
        <p className="text-gray-600">
          {highlightedDay === null || highlightedDay === 0
            ? "Showing all locations · Click any day to filter"
            : "Click here to show all locations again · Click any day to filter"}
        </p>
      </div>

      {itinerary.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No itinerary available.
        </p>
      ) : (
        <div ref={panelRef}>
          {itinerary.map((dayItem) => (
            <div
              key={dayItem.day}
              onClick={() => handleDayClick(dayItem.day)}
              className={`
                itinerary-day-animated relative border-l-4 pl-6 mb-8 cursor-pointer
                transition-all duration-500 ease-in-out
                ${
                  highlightedDay === dayItem.day
                    ? "border-purple-600 bg-purple-50/50 -ml-4 pl-10 rounded-r-2xl py-2"
                    : "border-blue-400 hover:border-purple-400"
                }
              `}
            >
              <div
                className={`
                  absolute -left-5 top-0 w-10 h-10 rounded-full 
                  text-white font-bold flex items-center justify-center shadow-md
                  transition-all duration-500
                  ${
                    highlightedDay === dayItem.day
                      ? "bg-gradient-to-br from-purple-600 to-pink-600 scale-125"
                      : "bg-gradient-to-br from-blue-600 to-purple-600"
                  }
                `}
              >
                {dayItem.day}
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {dayItem.title}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {dayItem.date} · {weatherData[dayItem.date] || "Loading..."}
                </p>
              </div>

              <div className="space-y-4">
                {dayItem.activities.map((activity, index) => (
                  <ItineraryCard
                    key={index}
                    {...activity}
                    onActivityClick={onActivityClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItineraryPanel;
