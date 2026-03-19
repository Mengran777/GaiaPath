// src/components/MainPanel/ItineraryCard.tsx
import React, { useRef, useEffect } from "react";
import { Location } from "../../types/itinerary";

interface ItineraryCardProps {
  title: string;
  description: string;
  time?: string;
  rating?: number;
  price?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  onActivityClick: (location: Location) => void;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({
  title,
  description,
  time,
  rating,
  price,
  imageUrl,
  latitude,
  longitude,
  onActivityClick,
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
      currentCard.addEventListener("touchstart", handleTouchStart, { passive: true });
      currentCard.addEventListener("touchend", handleTouchEnd, { passive: true });
    }

    return () => {
      if (currentCard && "ontouchstart" in window) {
        currentCard.removeEventListener("touchstart", handleTouchStart);
        currentCard.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      latitude !== 0 &&
      longitude !== 0
    ) {
      onActivityClick({
        name: title,
        latitude,
        longitude,
        description,
        imageUrl,
      });
    }
  };

  return (
    <div
      ref={cardRef}
      className="bg-gray-50 rounded-xl p-5 mb-4 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer
                 border-2 border-transparent hover:border-[#2d9e8a] flex flex-col md:flex-row items-start gap-4 active:scale-[0.98]"
      onClick={handleCardClick}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="w-full md:w-48 h-32 object-cover rounded-lg flex-shrink-0 shadow-sm"
        />
      )}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-800 mb-2 text-[#0d3d38]">{title}</h3>
        <p className="text-gray-600 text-sm mb-3">{description}</p>
        <div className="flex justify-between items-center text-gray-600 text-sm">
          {time && (
            <div className="flex items-center gap-1">
              <span className="text-[#2d9e8a]">⏰</span> {time}
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
                  <span className="text-green-600">£</span> {price}
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
