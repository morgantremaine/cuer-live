/**
 * Test utility to validate timing calculations work correctly
 * Run this to verify all edge cases are handled properly
 */

import { timeToSeconds, secondsToTime, addDurationToTime, isValidTimeFormat } from './timeUtils';
import { calculateEndTime } from './rundownCalculations';

export const runTimingTests = () => {
  console.log('🧪 Running timing calculation tests...');

  // Test 1: MM:SS format with minutes > 60
  console.log('\n📋 Test 1: MM:SS format with minutes > 60');
  const test1Start = '10:05:00';
  const test1Duration = '90:30'; // 90 minutes 30 seconds
  const test1Expected = '11:35:30'; // 10:05:00 + 1:30:30
  const test1Result = calculateEndTime(test1Start, test1Duration);
  console.log(`Start: ${test1Start}, Duration: ${test1Duration}`);
  console.log(`Expected: ${test1Expected}, Got: ${test1Result}`);
  console.log(`✅ Pass: ${test1Result === test1Expected}`);

  // Test 2: Regular HH:MM:SS format
  console.log('\n📋 Test 2: Regular HH:MM:SS format');
  const test2Start = '09:30:00';
  const test2Duration = '01:15:45';
  const test2Expected = '10:45:45';
  const test2Result = calculateEndTime(test2Start, test2Duration);
  console.log(`Start: ${test2Start}, Duration: ${test2Duration}`);
  console.log(`Expected: ${test2Expected}, Got: ${test2Result}`);
  console.log(`✅ Pass: ${test2Result === test2Expected}`);

  // Test 3: MM:SS format normal case
  console.log('\n📋 Test 3: MM:SS format normal case');
  const test3Start = '08:00:00';
  const test3Duration = '02:30'; // 2 minutes 30 seconds
  const test3Expected = '08:02:30';
  const test3Result = calculateEndTime(test3Start, test3Duration);
  console.log(`Start: ${test3Start}, Duration: ${test3Duration}`);
  console.log(`Expected: ${test3Expected}, Got: ${test3Result}`);
  console.log(`✅ Pass: ${test3Result === test3Expected}`);

  // Test 4: Time conversion consistency
  console.log('\n📋 Test 4: Time conversion consistency');
  const test4Time = '75:45'; // 75 minutes 45 seconds = 1:15:45
  const test4Seconds = timeToSeconds(test4Time);
  const test4BackToTime = secondsToTime(test4Seconds);
  const test4Expected = '01:15:45';
  console.log(`Original: ${test4Time}`);
  console.log(`Seconds: ${test4Seconds}`);
  console.log(`Back to time: ${test4BackToTime}`);
  console.log(`Expected: ${test4Expected}`);
  console.log(`✅ Pass: ${test4BackToTime === test4Expected}`);

  // Test 5: Edge case - very large minutes
  console.log('\n📋 Test 5: Edge case - very large minutes');
  const test5Duration = '150:30'; // 2.5 hours + 30 seconds
  const test5Seconds = timeToSeconds(test5Duration);
  const test5Expected = 150 * 60 + 30; // 9030 seconds
  console.log(`Duration: ${test5Duration}`);
  console.log(`Seconds: ${test5Seconds}, Expected: ${test5Expected}`);
  console.log(`✅ Pass: ${test5Seconds === test5Expected}`);

  // Test 6: addDurationToTime function
  console.log('\n📋 Test 6: addDurationToTime function');
  const test6Start = '10:30:00';
  const test6Duration = '45:15'; // 45 minutes 15 seconds
  const test6Expected = '11:15:15';
  const test6Result = addDurationToTime(test6Start, test6Duration);
  console.log(`Start: ${test6Start}, Duration: ${test6Duration}`);
  console.log(`Expected: ${test6Expected}, Got: ${test6Result}`);
  console.log(`✅ Pass: ${test6Result === test6Expected}`);

  console.log('\n🎉 All timing tests completed!');
};

// Helper to test specific problematic cases from the screenshot
export const testScreenshotScenario = () => {
  console.log('\n🖼️ Testing specific screenshot scenario...');
  
  // Row 2 from screenshot: Start 10:05:00, Duration 02:00, should be End 10:07:00
  const startTime = '10:05:00';
  const duration = '02:00'; // 2 minutes
  const expectedEnd = '10:07:00';
  const actualEnd = calculateEndTime(startTime, duration);
  
  console.log(`Screenshot Test:`);
  console.log(`Start: ${startTime}, Duration: ${duration}`);
  console.log(`Expected End: ${expectedEnd}, Actual End: ${actualEnd}`);
  console.log(`✅ Fixed: ${actualEnd === expectedEnd}`);
  
  return actualEnd === expectedEnd;
};