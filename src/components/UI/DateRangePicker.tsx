'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  triggerRef,
  onClose,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverDate, setHoverDate]       = useState<Date | null>(null);
  const popupRef  = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPopupStyle({
        position: 'fixed',
        top:      rect.bottom + 4,
        left:     rect.left,
        zIndex:   9999,
        minWidth: rect.width,
      });
    }
  }, [triggerRef]);

  // Calculate on mount, then track scroll/resize so popup follows the trigger row
  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  // Click outside: close when clicking outside popup AND trigger
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const inPopup   = popupRef.current?.contains(event.target as Node);
      const inTrigger = triggerRef.current?.contains(event.target as Node);
      if (!inPopup && !inTrigger) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  // ── Calendar logic (unchanged) ──
  const generateCalendarDays = () => {
    const year  = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth    = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const dateToString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T00:00`;

  const handleDayClick = (day: number) => {
    const selectedDate    = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const datetimeString  = dateToString(selectedDate);
    if (!startDate || (startDate && endDate)) {
      onStartDateChange(datetimeString);
      onEndDateChange('');
      setHoverDate(null);
    } else {
      const startDateTime = new Date(startDate);
      if (selectedDate >= startDateTime) {
        onEndDateChange(datetimeString);
      } else {
        onStartDateChange(datetimeString);
        onEndDateChange('');
      }
    }
  };

  const handleDayHover = (day: number) => {
    if (startDate && !endDate) {
      setHoverDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }
  };

  const isDayInRange = (day: number) => {
    const cur = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (startDate && endDate) {
      return cur > new Date(startDate) && cur < new Date(endDate);
    }
    if (startDate && !endDate && hoverDate) {
      return cur > new Date(startDate) && cur < hoverDate;
    }
    return false;
  };

  const isDayStart = (day: number) => {
    if (!startDate) return false;
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString() ===
      new Date(startDate).toDateString();
  };

  const isDayEnd = (day: number) => {
    const cur = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (endDate)   return cur.toDateString() === new Date(endDate).toDateString();
    if (startDate && !endDate && hoverDate) return cur.toDateString() === hoverDate.toDateString();
    return false;
  };

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekDays   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      ref={popupRef}
      style={popupStyle}
      className="bg-white rounded-2xl border border-[#e2ddd8] shadow-xl p-4 min-w-[320px]"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-[#f0ede8] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-semibold text-[#1a1a1a] text-sm">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-[#f0ede8] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#8a8a8a] py-1 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {generateCalendarDays().map((day, index) => {
          if (day === null) return <div key={`e-${index}`} className="p-2" />;

          const isStart   = isDayStart(day);
          const isEnd     = isDayEnd(day);
          const isInRange = isDayInRange(day);
          const isToday   = new Date().toDateString() ===
            new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => handleDayHover(day)}
              className={`
                p-2 text-sm rounded-lg transition-all relative text-center
                ${isStart || isEnd
                  ? 'bg-[#0d3d38] text-white font-semibold'
                  : ''}
                ${isInRange
                  ? 'bg-[#e0f5f2] text-[#0d3d38]'
                  : ''}
                ${!isInRange && !isStart && !isEnd
                  ? 'hover:bg-[#f0ede8] text-[#4a4a4a]'
                  : ''}
                ${isToday && !isStart && !isEnd
                  ? 'ring-1 ring-[#c9a96e]'
                  : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-3 text-[10.5px] text-[#8a8a8a] text-center">
        {!startDate || (startDate && endDate) ? 'Select check-in date' : 'Select check-out date'}
      </div>

      {/* Clear button */}
      {(startDate || endDate) && (
        <button
          type="button"
          onClick={() => { onStartDateChange(''); onEndDateChange(''); setHoverDate(null); }}
          className="mt-2 w-full py-1.5 text-xs text-[#c9a96e] hover:bg-[#fdf4e7] rounded-lg transition-colors"
        >
          Clear dates
        </button>
      )}
    </div>,
    document.body
  );
};

export default DateRangePicker;
