// src/components/MainPanel/ItineraryCard.tsx
import React, { useRef, useEffect } from "react";

// Define Location type - ensure this is consistent across App.tsx, ItineraryPanel.tsx, and ItineraryCard.tsx
// It's best if this is defined in a shared types file (e.g., src/app/types/itinerary.ts)
interface Location {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
}

interface ItineraryCardProps {
  title: string;
  description: string;
  time?: string;
  rating?: number;
  price?: string;
  imageUrl?: string;
  latitude?: number; // ⭐ ADDED: latitude prop ⭐
  longitude?: number; // ⭐ ADDED: longitude prop ⭐
  onActivityClick: (location: Location) => void;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({
  title,
  description,
  time,
  rating,
  price,
  imageUrl,
  latitude, // ⭐ DESTRUCTURED: latitude ⭐
  longitude, // ⭐ DESTRUCTURED: longitude ⭐
  onActivityClick, // ⭐ DESTRUCTURED: onActivityClick ⭐
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTouchStart = () => {
      if (cardRef.current) cardRef.current.style.transform = "scale(0.98)";
    };
    const handleTouchEnd = () => {
      if (cardRef.current) cardRef.current.style.transform = "";
    };

    const currentCard = cardRef.current;
    if (currentCard && "ontouchstart" in window) {
      currentCard.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      currentCard.addEventListener("touchend", handleTouchEnd, {
        passive: true,
      });
    }

    return () => {
      if (currentCard && "ontouchstart" in window) {
        currentCard.removeEventListener("touchstart", handleTouchStart);
        currentCard.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, []);

  // Handler for clicking the entire card to focus on the map
  const handleCardClick = () => {
    // Only trigger if valid coordinates exist
    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      latitude !== 0 &&
      longitude !== 0
    ) {
      onActivityClick({
        name: title,
        latitude: latitude,
        longitude: longitude,
        description: description,
        imageUrl: imageUrl,
      });
    } else {
      // Optional: Add a user-friendly message or visual cue if coordinates are missing
      console.warn(
        `Activity "${title}" has no valid coordinates to display on the map.`
      );
    }
  };

  // Handler for clicking the title to go to Wikipedia
  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the parent card's onClick from firing when clicking the title
    const encodedTitle = encodeURIComponent(title);
    const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodedTitle}`;
    window.open(wikipediaUrl, "_blank");
  };

  return (
    <div
      ref={cardRef}
      className="bg-gray-50 rounded-xl p-5 mb-4 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer
                 border-2 border-transparent hover:border-blue-300 flex flex-col md:flex-row items-start gap-4 active:scale-98"
      onClick={handleCardClick} // ⭐ Attach the map focus handler to the whole card ⭐
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="w-full md:w-48 h-32 object-cover rounded-lg flex-shrink-0 shadow-sm"
        />
      )}
      <div className="flex-1">
        <h3
          className="text-lg font-bold text-gray-800 mb-2 cursor-pointer hover:underline text-blue-700"
          onClick={handleTitleClick} // ⭐ Keep Wikipedia handler on title ⭐
        >
          {title}
        </h3>
        <p className="text-gray-600 text-sm mb-3">{description}</p>
        <div className="flex justify-between items-center text-gray-600 text-sm">
          {time && (
            <div className="flex items-center gap-1">
              <span className="text-blue-500">⏰</span> {time}
            </div>
          )}
          {(rating || price) && (
            <div className="flex items-center gap-2">
              {rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span> {rating}
                </div>
              )}
              {price && (
                <div className="flex items-center gap-1">
                  <span className="text-green-600">¥</span> {price}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItineraryCard;
