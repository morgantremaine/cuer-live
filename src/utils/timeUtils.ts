
/**
 * Enhanced time calculation utilities with better error handling
 */

export const timeToSeconds = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  const parts = timeStr.split(':').map(Number);
  
  if (parts.some(isNaN)) return 0;
  
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
};

export const secondsToTime = (seconds: number): string => {
  if (typeof seconds !== 'number' || seconds < 0) return '00:00:00';
  
  // Ensure we're working with a positive integer to prevent jumping
  const totalSeconds = Math.max(0, Math.floor(seconds));
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60); // Fixed: Added Math.floor to prevent jumping
  
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

export const isValidTimeFormat = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(timeStr);
};
