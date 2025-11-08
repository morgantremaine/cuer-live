import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ClockFormat = '12' | '24';

interface ClockFormatContextType {
  clockFormat: ClockFormat;
  formatTime: (timeString: string) => string;
  toggleClockFormat: () => void;
}

const ClockFormatContext = createContext<ClockFormatContextType | undefined>(undefined);

const CLOCK_FORMAT_KEY = 'rundown-clock-format';

export const ClockFormatProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage or default to 12-hour
  const [clockFormat, setClockFormat] = useState<ClockFormat>(() => {
    const saved = localStorage.getItem(CLOCK_FORMAT_KEY);
    return (saved === '12' || saved === '24') ? saved : '12';
  });

  // Persist to localStorage when format changes
  useEffect(() => {
    localStorage.setItem(CLOCK_FORMAT_KEY, clockFormat);
  }, [clockFormat]);

  const formatTime = useCallback((timeString: string) => {
    if (!timeString || timeString === '00:00:00') return timeString;
    
    // Handle both HH:MM:SS and HH:MM formats
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    
    if (clockFormat === '12') {
      const hours = parts[0];
      const minutes = parts[1];
      const seconds = parts[2] || '00';
      
      const hour24 = parseInt(hours, 10);
      if (isNaN(hour24)) return timeString;
      
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      
      return seconds 
        ? `${hour12}:${minutes}:${seconds} ${ampm}`
        : `${hour12}:${minutes} ${ampm}`;
    }
    
    // For 24-hour format, remove leading zero from hours
    const hours = parts[0];
    const hour24 = parseInt(hours, 10);
    if (isNaN(hour24)) return timeString;
    
    const minutes = parts[1];
    const seconds = parts[2];
    
    return seconds 
      ? `${hour24}:${minutes}:${seconds}`
      : `${hour24}:${minutes}`;
  }, [clockFormat]);

  const toggleClockFormat = () => {
    setClockFormat(prev => prev === '12' ? '24' : '12');
  };

  return (
    <ClockFormatContext.Provider value={{ clockFormat, formatTime, toggleClockFormat }}>
      {children}
    </ClockFormatContext.Provider>
  );
};

export const useClockFormat = () => {
  const context = useContext(ClockFormatContext);
  if (context === undefined) {
    throw new Error('useClockFormat must be used within a ClockFormatProvider');
  }
  return context;
};
