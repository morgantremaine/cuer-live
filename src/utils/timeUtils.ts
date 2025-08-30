
/**
 * Enhanced time calculation utilities with better error handling
 */

export const timeToSeconds = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  // Handle ISO datetime strings - extract time portion
  if (timeStr.includes('T')) {
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        return Math.floor(hours * 3600 + minutes * 60 + seconds);
      }
    } catch (error) {
      // Fall through to original parsing
    }
  }
  
  // Handle traditional HH:MM:SS or HH:MM format
  const parts = timeStr.split(':').map(Number);
  
  if (parts.some(isNaN)) return 0;
  
  if (parts.length === 2) {
    return Math.floor(parts[0] * 60 + parts[1]); // Floor to prevent fractional seconds
  } else if (parts.length === 3) {
    return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]); // Floor to prevent fractional seconds
  }
  
  return 0;
};

export const secondsToTime = (seconds: number): string => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00:00';
  
  // Ensure we're working with a positive integer to prevent jumping
  const totalSeconds = Math.max(0, Math.floor(Math.abs(seconds)));
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const addDurationToTime = (startTime: string, duration: string): string => {
  const startSeconds = timeToSeconds(startTime);
  const durationSeconds = timeToSeconds(duration);
  return secondsToTime(startSeconds + durationSeconds);
};

export const formatDuration = (duration: string): string => {
  const seconds = timeToSeconds(duration);
  return secondsToTime(seconds);
};

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

export const extractTimeFromISO = (isoString: string): string => {
  try {
    // If it's already in HH:MM:SS format, return as-is
    if (isoString && isoString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      return isoString.length === 5 ? `${isoString}:00` : isoString;
    }
    
    // If it's an ISO datetime string, extract the time portion
    if (isoString && isoString.includes('T')) {
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      }
    }
    
    // Fallback to default time
    return '09:00:00';
  } catch (error) {
    return '09:00:00';
  }
};

export const normalizeStartTime = (startTime: string, createdAt: string): string => {
  try {
    // If already ISO datetime string, return as-is
    if (startTime && startTime.includes('T')) {
      const date = new Date(startTime);
      if (!isNaN(date.getTime())) {
        return startTime;
      }
    }
    
    // If it's HH:MM:SS format, combine with creation date
    if (startTime && startTime.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      const creationDate = new Date(createdAt);
      if (!isNaN(creationDate.getTime())) {
        const [hours, minutes, seconds = '00'] = startTime.split(':');
        const normalizedDate = new Date(creationDate);
        normalizedDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
        return normalizedDate.toISOString();
      }
    }
    
    // Fallback: use creation date with default time
    const creationDate = new Date(createdAt);
    if (!isNaN(creationDate.getTime())) {
      creationDate.setHours(9, 0, 0, 0);
      return creationDate.toISOString();
    }
    
    // Final fallback: today with default time
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    return today.toISOString();
  } catch (error) {
    // Final fallback: today with default time
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    return today.toISOString();
  }
};

export const createDateTimeString = (date: Date, timeString: string): string => {
  try {
    const [hours, minutes, seconds = '00'] = timeString.split(':');
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
    return newDate.toISOString();
  } catch (error) {
    return date.toISOString();
  }
};

export const isValidTimeFormat = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(timeStr);
};
