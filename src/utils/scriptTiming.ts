/**
 * Utility functions for calculating script reading time
 */

/**
 * Counts the number of words in a text string
 * @param text - The text to count words in
 * @returns The number of words
 */
export const countWords = (text: string): number => {
  if (!text || typeof text !== 'string') return 0;
  
  // Remove extra whitespace and split by spaces, filter out empty strings
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Calculates reading time in seconds based on words per minute
 * @param wordCount - Number of words
 * @param wordsPerMinute - Reading speed (default: 150 wpm)
 * @returns Reading time in seconds
 */
export const calculateReadingTimeSeconds = (wordCount: number, wordsPerMinute: number = 150): number => {
  if (wordCount <= 0 || wordsPerMinute <= 0) return 0;
  
  return Math.round((wordCount / wordsPerMinute) * 60);
};

/**
 * Converts seconds to MM:SS format
 * @param seconds - Time in seconds
 * @returns Time formatted as MM:SS
 */
export const secondsToMMSS = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Calculates reading time from script text and returns in MM:SS format
 * @param scriptText - The script text to analyze
 * @param wordsPerMinute - Reading speed (default: 150 wpm)
 * @returns Reading time formatted as MM:SS
 */
export const calculateScriptDuration = (scriptText: string, wordsPerMinute: number = 150): string => {
  const wordCount = countWords(scriptText);
  const seconds = calculateReadingTimeSeconds(wordCount, wordsPerMinute);
  return secondsToMMSS(seconds);
};