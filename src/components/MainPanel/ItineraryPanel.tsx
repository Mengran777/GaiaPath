// src/components/MainPanel/ItineraryPanel.tsx (MODIFIED)

import React, { useEffect, useRef } from "react";
import ItineraryCard from "./ItineraryCard";
import { DayItinerary, Location } from "../../types/itinerary";

interface ItineraryPanelProps {
  itinerary: DayItinerary[];
  onActivityClick: (location: Location) => void;
  onDayClick?: (dayNumber: number) => void;
  highlightedDay?: number | null;
  routeId?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onBackToRoutes?: () => void;
}

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  itinerary,
  onActivityClick,
  onDayClick,
  highlightedDay = null,
  routeId,
  isFavorite = false,
  onToggleFavorite,
  onBackToRoutes,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

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
          (entry.target as HTMLElement).classList.remove("opacity-0", "translate-y-8");
        }
      });
    }, observerOptions);

    if (panelRef.current) {
      const dayElements = panelRef.current.querySelectorAll(
        ".itinerary-day-animated"
      );
      dayElements.forEach((el) => {
        (el as HTMLElement).classList.add("opacity-0", "translate-y-8");
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
      {/* Back button */}
      {onBackToRoutes && (
        <button
          onClick={onBackToRoutes}
          className="flex items-center gap-1.5 text-sm text-[#1a6b5e] hover:text-[#0d3d38] font-medium mb-4 transition-colors group"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          <span className="group-hover:underline">Back to routes</span>
        </button>
      )}

      {/* Header */}
      <div
        className="mb-6 pb-4 border-b-2 border-gray-100 relative cursor-pointer hover:bg-gray-50 rounded-lg p-4 -mx-4 transition-colors duration-200"
        onClick={() => onDayClick && onDayClick(0)}
      >
        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center
                       text-base leading-none transition-all duration-150
                       ${isFavorite
                         ? "bg-[#c9a96e] border-[1.5px] border-[#c9a96e] text-white"
                         : "bg-white border-[1.5px] border-[#e8e4df] text-[#b0b0b0] hover:border-[#c9a96e]"
                       }`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
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
                    ? "border-[#1a6b5e] bg-[#f0faf8]/50 -ml-4 pl-10 rounded-r-2xl py-2"
                    : "border-[#2d9e8a] hover:border-[#1a6b5e]"
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
                      ? "bg-gradient-to-br from-[#0d3d38] to-[#2d9e8a] scale-125"
                      : "bg-gradient-to-br from-[#0d3d38] to-[#1a6b5e]"
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
                  {dayItem.date}
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
