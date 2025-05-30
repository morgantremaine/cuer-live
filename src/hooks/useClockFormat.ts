
import { useState } from 'react';

export type ClockFormat = '12' | '24';

export const useClockFormat = () => {
  const [clockFormat, setClockFormat] = useState<ClockFormat>('24');

  const formatTime = (timeString: string, format: ClockFormat = clockFormat) => {
    if (!timeString || timeString === '00:00:00') return timeString;
    
    if (format === '12') {
      const [hours, minutes, seconds] = timeString.split(':');
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
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
