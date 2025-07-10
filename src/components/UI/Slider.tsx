import React from "react";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step,
  value,
  onValueChange,
  className = "",
  ...props
}) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={`w-full h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:appearance-none
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white
                  [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:shadow-md transition-all duration-200 ${className}`}
      {...props}
    />
  );
};

export default Slider;
