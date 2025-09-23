import { timeToSeconds, secondsToTime, addDurationToTime, isValidTimeFormat } from './timeUtils';
import { calculateEndTime } from './rundownCalculations';

// Run tests immediately when imported  
console.log('🧪 Running timing calculation tests...');

// Test the specific screenshot scenario first
console.log('\n🖼️ Testing specific screenshot scenario...');
const startTime = '10:05:00';
const duration = '02:00'; // 2 minutes
const expectedEnd = '10:07:00';
const actualEnd = calculateEndTime(startTime, duration);

console.log(`Screenshot Test:`);
console.log(`Start: ${startTime}, Duration: ${duration}`);
console.log(`Expected End: ${expectedEnd}, Actual End: ${actualEnd}`);
console.log(`✅ Fixed: ${actualEnd === expectedEnd ? 'YES' : 'NO'}`);

// Test MM:SS format with minutes > 60
console.log('\n📋 Test: MM:SS format with minutes > 60');
const test1Start = '10:05:00';
const test1Duration = '90:30'; // 90 minutes 30 seconds
const test1Expected = '11:35:30'; // 10:05:00 + 1:30:30
const test1Result = calculateEndTime(test1Start, test1Duration);
console.log(`Start: ${test1Start}, Duration: ${test1Duration}`);
console.log(`Expected: ${test1Expected}, Got: ${test1Result}`);
console.log(`✅ Pass: ${test1Result === test1Expected ? 'YES' : 'NO'}`);

console.log('\n🎉 Timing tests completed!');