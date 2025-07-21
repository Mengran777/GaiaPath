// src/components/MainPanel/ItineraryPanel.tsx

import React, { useState, useEffect, useRef } from "react";
import ItineraryCard from "./ItineraryCard";
import Section from "../Layout/Section";
import { DayItinerary, Activity } from "../../app/types/itinerary"; // Ensure Activity is imported

// Define Location type - It's best practice to define this in a shared types file
// like src/app/types/itinerary.ts and import it.
// For now, we'll define it here to resolve the error.
interface Location {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
}

// ⭐ CORRECTED: Single, unified ItineraryPanelProps interface ⭐
interface ItineraryPanelProps {
  itinerary: DayItinerary[];
  onActivityClick: (location: Location) => void;
}

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  itinerary,
  onActivityClick,
}) => {
  // Destructure onActivityClick here
  const [weatherData, setWeatherData] = useState<{ [key: string]: string }>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Simulate weather update (your existing code)
  useEffect(() => {
    if (!itinerary || itinerary.length === 0) {
      setWeatherData({});
      return;
    }

    const updateWeather = () => {
      const weatherOptions = [
        "晴朗", // Sunny
        "局部多云", // Partly Cloudy
        "小雨", // Light Rain
        "阴天", // Overcast
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

  // Intersection Observer for fade-in animation (your existing code)
  useEffect(() => {
    if (!itinerary || itinerary.length === 0) {
      return;
    }

    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = "1";
          (entry.target as HTMLElement).style.transform = "translateY(0)";
        } else {
          // Only animate out if not loading and not just initialized
          if (panelRef.current?.dataset.initialized === "true") {
            (entry.target as HTMLElement).style.opacity = "0";
            (entry.target as HTMLElement).style.transform = "translateY(30px)";
          }
        }
      });
    }, observerOptions);

    if (panelRef.current) {
      panelRef.current.dataset.initialized = "false"; // Mark as not initialized yet
      const dayElements = panelRef.current.querySelectorAll(
        ".itinerary-day-animated"
      );
      dayElements.forEach((el) => {
        (el as HTMLElement).style.opacity = "0";
        (el as HTMLElement).style.transform = "translateY(30px)";
        (el as HTMLElement).style.transition =
          "opacity 0.6s ease-out, transform 0.6s ease-out";
        observer.observe(el);
      });
      // After a short delay, mark as initialized to allow fade-out on scroll
      const timer = setTimeout(() => {
        if (panelRef.current) panelRef.current.dataset.initialized = "true";
      }, 100); // Small delay to allow initial render before marking as initialized
      return () => clearTimeout(timer); // Clear timeout on unmount
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

  return (
    <Section
      title="您的定制行程" // Changed title to Chinese
      className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar"
    >
      {itinerary.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          请在左侧输入偏好并生成行程。
        </p>
      ) : (
        <div ref={panelRef}>
          {itinerary.map((dayItem) => (
            <div
              key={dayItem.day}
              className="itinerary-day-animated relative border-l-4 border-blue-400 pl-6 mb-8"
            >
              <div
                className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600
                                  text-white font-bold flex items-center justify-center shadow-md"
              >
                {dayItem.day}
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {/* ⭐ MODIFIED: Use dayItem.theme for consistency with DayItinerary type ⭐ */}
                  {dayItem.title}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {dayItem.date} · {weatherData[dayItem.date] || "加载中..."}
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
    </Section>
  );
};

export default ItineraryPanel;
