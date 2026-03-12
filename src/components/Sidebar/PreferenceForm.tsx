import React from "react";
import { Input, Select, Slider, Tag, TypeCard, LocationAutocomplete } from "../UI"; // Import from UI
import Section from "../Layout/Section"; // Import from Layout
import DateRangePicker from "../UI/DateRangePicker";

interface PreferenceFormProps {
  preferences: {
    destination: string;
    travelStartDate: string;
    travelEndDate: string;
    // budget: number;
    travelers: string;
    travelType: string[];
    transportation: string[];
    activityIntensity: string;
    specialNeeds: string[];
  };
  onPreferenceChange: (key: string, value: any) => void;
}

const PreferenceForm: React.FC<PreferenceFormProps> = ({
  preferences,
  onPreferenceChange,
}) => {
  const travelTypes = [
    { label: "History & Culture", icon: "🏛️", value: "history" },
    { label: "Food Experience", icon: "🍝", value: "food" },
    { label: "Nature Scenery", icon: "🏞️", value: "nature" },
    { label: "Art & Shopping", icon: "🎨", value: "art_shopping" },
    { label: "Adventure Challenge", icon: "⛰️", value: "adventure" },
    { label: "Romantic Honeymoon", icon: "💖", value: "honeymoon" },
    { label: "Family Trip", icon: "👨‍👩‍👧‍👦", value: "family" },
    { label: "Relaxing Vacation", icon: "🏖️", value: "relax" },
  ];

  const transportationTypes = [
    { label: "High-speed Rail/Train", icon: "🚄", value: "train" },
    { label: "Flight", icon: "✈️", value: "plane" },
    { label: "Self-drive Car Rental", icon: "🚗", value: "car" },
    { label: "Public Transport", icon: "🚌", value: "public_transport" },
  ];

  const specialNeedsTags = [
    "Accessibility",
    "Kid-friendly",
    "Pet-friendly",
    "Vegetarian Options",
    "WiFi Essential",
  ];

  // const getBudgetLabel = (budget: number) => {
  //   const minBudget = Math.max(1000, budget - 5000);
  //   const maxBudget = budget;
  //   return `Budget Range: ¥${minBudget.toLocaleString()} - ¥${maxBudget.toLocaleString()}`;
  // };

  return (
    <Section
      title="⚙️ Travel Preferences"
      className="mt-4"
    >
      <div className="space-y-6">
        <div className="form-group">
          <label
            htmlFor="destination"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Country/City
          </label>
          <LocationAutocomplete
            id="destination"
            value={preferences.destination}
            onChange={(value) => onPreferenceChange("destination", value)}
            placeholder="e.g., Paris, New York, Tokyo"
          />
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Travel Date Range
          </label>
          <DateRangePicker
            startDate={preferences.travelStartDate}
            endDate={preferences.travelEndDate}
            onStartDateChange={(date) => onPreferenceChange("travelStartDate", date)}
            onEndDateChange={(date) => onPreferenceChange("travelEndDate", date)}
          />
        </div>

        {/* <div className="form-group">
          <label
            htmlFor="budget"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {getBudgetLabel(preferences.budget)}
          </label>
          <Slider
            id="budget"
            min={1000}
            max={50000}
            step={1000}
            value={preferences.budget}
            onValueChange={(val) => onPreferenceChange("budget", val)}
          />
        </div> */}

        <div className="form-group">
          <label
            htmlFor="travelers"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Number of Travelers
          </label>
          <Select
            id="travelers"
            value={preferences.travelers}
            onChange={(e) => onPreferenceChange("travelers", e.target.value)}
          >
            <option value="1">Solo</option>
            <option value="2">2 people (Couple/Friends)</option>
            <option value="3-4">3-4 people (Family/Small Group)</option>
            <option value="5+">5+ people (Large Group)</option>
          </Select>
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Travel Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {travelTypes.map((type) => (
              <TypeCard
                key={type.value}
                label={type.label}
                icon={type.icon}
                isSelected={preferences.travelType.includes(type.value)}
                onClick={() => {
                  const newTypes = preferences.travelType.includes(type.value)
                    ? preferences.travelType.filter((t) => t !== type.value)
                    : [...preferences.travelType, type.value];
                  onPreferenceChange("travelType", newTypes);
                }}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Transportation Preference
          </label>
          <div className="grid grid-cols-2 gap-3">
            {transportationTypes.map((type) => (
              <TypeCard
                key={type.value}
                label={type.label}
                icon={type.icon}
                isSelected={preferences.transportation.includes(type.value)}
                onClick={() => {
                  const newTypes = preferences.transportation.includes(
                    type.value
                  )
                    ? preferences.transportation.filter((t) => t !== type.value)
                    : [...preferences.transportation, type.value];
                  onPreferenceChange("transportation", newTypes);
                }}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label
            htmlFor="activityIntensity"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Activity Intensity
          </label>
          <Select
            id="activityIntensity"
            value={preferences.activityIntensity}
            onChange={(e) =>
              onPreferenceChange("activityIntensity", e.target.value)
            }
          >
            <option value="easy">Relaxed</option>
            <option value="moderate">Moderate Pace</option>
            <option value="fast">Fast-paced</option>
            <option value="high">High-intensity Adventure</option>
          </Select>
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Special Needs
          </label>
          <div className="flex flex-wrap gap-2">
            {specialNeedsTags.map((tag) => (
              <Tag
                key={tag}
                label={tag}
                isSelected={preferences.specialNeeds.includes(tag)}
                onClick={() => {
                  const newNeeds = preferences.specialNeeds.includes(tag)
                    ? preferences.specialNeeds.filter((n) => n !== tag)
                    : [...preferences.specialNeeds, tag];
                  onPreferenceChange("specialNeeds", newNeeds);
                }}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-[0.98]"
              />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};

export default PreferenceForm;
