import { useState, useEffect } from 'react';

export type ClockFormat = '12' | '24';

const CLOCK_FORMAT_KEY = 'rundown-clock-format';

export const useClockFormat = () => {
  // Initialize from localStorage or default to 24-hour
  const [clockFormat, setClockFormat] = useState<ClockFormat>(() => {
    const saved = localStorage.getItem(CLOCK_FORMAT_KEY);
    return (saved === '12' || saved === '24') ? saved : '24';
  });

  // Persist to localStorage when format changes
  useEffect(() => {
    localStorage.setItem(CLOCK_FORMAT_KEY, clockFormat);
  }, [clockFormat]);

  const formatTime = (timeString: string, format: ClockFormat = clockFormat) => {
    if (!timeString || timeString === '00:00:00') return timeString;
    
    // Handle both HH:MM:SS and HH:MM formats
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    
    if (format === '12') {
      const hours = parts[0];
      const minutes = parts[1];
      const seconds = parts[2] || '00';
      
      const hour24 = parseInt(hours, 10);
      if (isNaN(hour24)) return timeString;
      
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      
      return seconds 
        ? `${hour12.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`
        : `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    }
    
    return timeString;
  };

  const toggleClockFormat = () => {
    setClockFormat(prev => prev === '12' ? '24' : '12');
  };

  return {
    clockFormat,
    formatTime,
    toggleClockFormat
  };
};