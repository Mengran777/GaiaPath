'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DateRangePickerProps {
  startDate: string; // ISO format datetime string
  endDate: string; // ISO format datetime string
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Format the displayed date range
  const formatDateRange = () => {
    if (!startDate && !endDate) return 'Select date range';

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && end) {
      return `${formatDate(start)} - ${formatDate(end)}`;
    } else if (start) {
      return `${formatDate(start)} - Select end date`;
    }
    return 'Select date range';
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];

    // Fill empty slots at the beginning
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Fill actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const dateToString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T00:00`;
  };

  const handleDayClick = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const selectedDate = new Date(year, month, day);
    const datetimeString = dateToString(selectedDate);

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onStartDateChange(datetimeString);
      onEndDateChange('');
      setHoverDate(null);
    } else {
      // Complete the range
      const startDateTime = new Date(startDate);
      if (selectedDate >= startDateTime) {
        onEndDateChange(datetimeString);
      } else {
        // If clicked date is before start, make it the new start
        onStartDateChange(datetimeString);
        onEndDateChange('');
      }
    }
  };

  const handleDayHover = (day: number) => {
    if (startDate && !endDate) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      setHoverDate(new Date(year, month, day));
    }
  };

  const isDayInRange = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const currentDate = new Date(year, month, day);

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return currentDate > start && currentDate < end;
    }

    // Show preview range when hovering
    if (startDate && !endDate && hoverDate) {
      const start = new Date(startDate);
      return currentDate > start && currentDate < hoverDate;
    }

    return false;
  };

  const isDayStart = (day: number) => {
    if (!startDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const currentDate = new Date(year, month, day);
    const start = new Date(startDate);
    return currentDate.toDateString() === start.toDateString();
  };

  const isDayEnd = (day: number) => {
    if (endDate) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const currentDate = new Date(year, month, day);
      const end = new Date(endDate);
      return currentDate.toDateString() === end.toDateString();
    }

    // Show preview end when hovering
    if (startDate && !endDate && hoverDate) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const currentDate = new Date(year, month, day);
      return currentDate.toDateString() === hoverDate.toDateString();
    }

    return false;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative" ref={calendarRef}>
      {/* Input display */}
      <div
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full p-3 border-2 border-gray-200 rounded-xl font-medium text-gray-800
                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                   transition-all duration-300 bg-white shadow-sm hover:shadow-md cursor-pointer
                   flex items-center justify-between"
      >
        <span className={startDate || endDate ? 'text-gray-800' : 'text-gray-400'}>
          {formatDateRange()}
        </span>
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Calendar popup */}
      {showCalendar && (
        <div className="absolute z-50 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl p-4 min-w-[320px]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="font-semibold text-gray-800">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days grid */}
          <div className="grid grid-cols-7 gap-1">
            {generateCalendarDays().map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="p-2" />;
              }

              const isInRange = isDayInRange(day);
              const isStart = isDayStart(day);
              const isEnd = isDayEnd(day);
              const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();
              const isHovering = startDate && !endDate && hoverDate;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => handleDayHover(day)}
                  className={`
                    p-2 text-sm rounded-lg transition-all relative
                    ${isStart || isEnd ? 'bg-blue-500 text-white font-semibold z-10' : ''}
                    ${isInRange ? 'bg-blue-100 text-blue-800' : ''}
                    ${!isInRange && !isStart && !isEnd ? 'hover:bg-gray-100 text-gray-700' : ''}
                    ${isToday && !isStart && !isEnd ? 'ring-1 ring-blue-400' : ''}
                    ${isHovering && isInRange ? 'bg-blue-50' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Help text */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            {!startDate || (startDate && endDate) ? 'Select check-in date' : 'Select check-out date'}
          </div>

          {/* Clear button */}
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                onStartDateChange('');
                onEndDateChange('');
                setHoverDate(null);
              }}
              className="mt-3 w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
