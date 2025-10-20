import { parseTimeInput } from './timeInputParser';
import { timeToSeconds, secondsToTime } from './timeUtils';

/**
 * Calculate end time from start time + duration
 * @param startTime - Time in HH:MM:SS or 12-hour format
 * @param duration - Duration in HH:MM:SS format
 * @returns End time in HH:MM:SS format
 */
export const calculateEndTime = (startTime: string, duration: string): string => {
  const parsedStart = parseTimeInput(startTime);
  const startSeconds = timeToSeconds(parsedStart);
  const durationSeconds = timeToSeconds(duration);
  
  const endSeconds = startSeconds + durationSeconds;
  return secondsToTime(endSeconds);
};

/**
 * Calculate duration between two times
 * @param startTime - Start time in HH:MM:SS or 12-hour format
 * @param endTime - End time in HH:MM:SS or 12-hour format
 * @returns Duration in HH:MM:SS format, or error message if end is before start
 */
export const calculateTimeDifference = (startTime: string, endTime: string): { result: string; error?: string } => {
  const parsedStart = parseTimeInput(startTime);
  const parsedEnd = parseTimeInput(endTime);
  
  const startSeconds = timeToSeconds(parsedStart);
  const endSeconds = timeToSeconds(parsedEnd);
  
  if (endSeconds < startSeconds) {
    return {
      result: '',
      error: 'End time must be after start time'
    };
  }
  
  const durationSeconds = endSeconds - startSeconds;
  return { result: secondsToTime(durationSeconds) };
};

/**
 * Add two durations together
 * @param duration1 - First duration in HH:MM:SS format
 * @param duration2 - Second duration in HH:MM:SS format
 * @returns Total duration in HH:MM:SS format
 */
export const addDurations = (duration1: string, duration2: string): string => {
  const seconds1 = timeToSeconds(duration1);
  const seconds2 = timeToSeconds(duration2);
  
  return secondsToTime(seconds1 + seconds2);
};

/**
 * Subtract one duration from another
 * @param duration1 - Duration to subtract from (larger)
 * @param duration2 - Duration to subtract (smaller)
 * @returns Remaining duration in HH:MM:SS format, or error if result would be negative
 */
export const subtractDurations = (duration1: string, duration2: string): { result: string; error?: string } => {
  const seconds1 = timeToSeconds(duration1);
  const seconds2 = timeToSeconds(duration2);
  
  if (seconds2 > seconds1) {
    return {
      result: '',
      error: 'Second duration cannot be larger than the first'
    };
  }
  
  return { result: secondsToTime(seconds1 - seconds2) };
};

/**
 * Calculate time until target (from current time)
 * @param targetTime - Target time in HH:MM:SS or 12-hour format
 * @returns Time remaining from now in HH:MM:SS format
 */
export const calculateTimeUntil = (targetTime: string): { result: string; error?: string } => {
  const parsedTarget = parseTimeInput(targetTime);
  const targetSeconds = timeToSeconds(parsedTarget);
  
  const now = new Date();
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  
  let remainingSeconds = targetSeconds - currentSeconds;
  
  // If target is earlier in the day, assume it's tomorrow
  if (remainingSeconds < 0) {
    remainingSeconds += 24 * 3600; // Add 24 hours
  }
  
  return { result: secondsToTime(remainingSeconds) };
};

/**
 * Format time for display with 12/24 hour option
 * @param time - Time in HH:MM:SS format
 * @param use24Hour - Whether to use 24-hour format
 * @returns Formatted time string
 */
export const formatTimeForDisplay = (time: string, use24Hour: boolean): string => {
  if (use24Hour || !time) return time;
  
  const parts = time.split(':');
  if (parts.length !== 3) return time;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const seconds = parts[2];
  
  if (isNaN(hours)) return time;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  
  return `${hours}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Parse flexible time input into standard format
 * @param input - Time input string
 * @returns Parsed time and validation status
 */
export const parseFlexibleTimeInput = (input: string): { time: string; isValid: boolean; error?: string } => {
  if (!input || !input.trim()) {
    return { time: '00:00:00', isValid: false, error: 'Please enter a time' };
  }
  
  try {
    const parsed = parseTimeInput(input);
    return { time: parsed, isValid: true };
  } catch (error) {
    return { 
      time: '00:00:00', 
      isValid: false, 
      error: 'Invalid time format. Use HH:MM:SS or H:MM AM/PM' 
    };
  }
};

/**
 * Format duration in human-readable format
 * @param duration - Duration in HH:MM:SS format
 * @returns Human-readable string like "2 hours, 30 minutes"
 */
export const formatDurationHuman = (duration: string): string => {
  const seconds = timeToSeconds(duration);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
  
  return parts.join(', ');
};
