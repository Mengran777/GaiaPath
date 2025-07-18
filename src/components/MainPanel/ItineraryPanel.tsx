import React, { useState, useEffect, useRef } from "react";
import ItineraryCard from "./ItineraryCard";
import Section from "../Layout/Section"; // Import from Layout

interface ItineraryPanelProps {
  itinerary: {
    day: number;
    title: string;
    date: string;
    activities: {
      title: string;
      description: string;
      time?: string;
      rating?: number;
      price?: string;
      imageUrl?: string;
    }[];
  }[];
}

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({ itinerary }) => {
  const [weatherData, setWeatherData] = useState<{ [key: string]: string }>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Simulate weather update
  useEffect(() => {
    // ⭐ Add a defensive check here ⭐
    if (!itinerary || itinerary.length === 0) {
      setWeatherData({}); // Clear weather data if no itinerary
      return; // Exit if itinerary is not ready
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
  }, [itinerary]); // Dependency array includes 'itinerary'

  // Intersection Observer for fade-in animation
  useEffect(() => {
    // ⭐ Add a defensive check here as well ⭐
    if (!itinerary || itinerary.length === 0) {
      return; // Exit if itinerary is not ready
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
          // Optional: reset when out of view for re-animation on scroll back
          (entry.target as HTMLElement).style.opacity = "0";
          (entry.target as HTMLElement).style.transform = "translateY(30px)";
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
        (el as HTMLElement).style.transition =
          "opacity 0.6s ease-out, transform 0.6s ease-out";
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
  }, [itinerary]); // Dependency array includes 'itinerary'

  return (
    <Section
      title="Recommended Itinerary"
      className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar"
    >
      {/* This check is already good for the main rendering */}
      {itinerary.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Please enter preferences on the left and generate an itinerary.
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
                  {dayItem.title}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {dayItem.date} · {weatherData[dayItem.date] || "Loading..."}
                </p>
              </div>
              <div className="space-y-4">
                {/* It's good that you're mapping dayItem.activities, which should be an array */}
                {dayItem.activities.map((activity, index) => (
                  <ItineraryCard key={index} {...activity} />
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
