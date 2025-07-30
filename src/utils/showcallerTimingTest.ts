/**
 * Temporary testing utility to debug showcaller timing calculations
 * User scenario: Item starts at 09:00:00, pressed play at 16:34:00, showing over by 07:34:00
 */

import { timeToSeconds, secondsToTime } from './rundownCalculations';

export const testShowcallerTiming = () => {
  console.log('🧪 Testing showcaller timing calculation...');
  
  // User's scenario
  const rundownStartTime = '09:00:00';
  const currentTime = '16:34:00';
  const expectedDifference = '07:34:00';
  
  // Convert to seconds for calculation
  const rundownStartSeconds = timeToSeconds(rundownStartTime);
  const currentTimeSeconds = timeToSeconds(currentTime);
  
  console.log('📊 Input values:', {
    rundownStartTime,
    currentTime,
    expectedDifference,
    rundownStartSeconds,
    currentTimeSeconds
  });
  
  // Calculate real elapsed time since rundown start
  let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
  
  console.log('📊 Real elapsed time calculation:', {
    realElapsedSeconds,
    realElapsedFormatted: secondsToTime(realElapsedSeconds)
  });
  
  // This should show 07:34:00 (7 hours 34 minutes)
  // 16:34:00 - 09:00:00 = 07:34:00
  
  // Check if this matches expected
  const expectedSeconds = timeToSeconds(expectedDifference);
  const isCorrect = realElapsedSeconds === expectedSeconds;
  
  console.log('✅ Timing verification:', {
    calculatedSeconds: realElapsedSeconds,
    expectedSeconds,
    calculatedFormatted: secondsToTime(realElapsedSeconds),
    expectedFormatted: expectedDifference,
    isCorrect
  });
  
  return {
    realElapsedSeconds,
    realElapsedFormatted: secondsToTime(realElapsedSeconds),
    isCorrect
  };
};