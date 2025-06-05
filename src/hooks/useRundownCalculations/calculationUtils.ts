
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { timeToSeconds, secondsToTimeString } from './timeUtils';

export const calculateTotalRuntime = (items: RundownItem[]): string => {
  // Only include non-floated items in the total runtime calculation
  let totalSeconds = items.reduce((acc, item) => {
    // Skip floated items and headers - they don't count towards runtime
    if (item.isFloating || item.isFloated || isHeaderItem(item)) {
      return acc;
    }
    return acc + timeToSeconds(item.duration);
  }, 0);

  return secondsToTimeString(totalSeconds);
};

export const calculateHeaderDuration = (
  index: number, 
  items: RundownItem[]
): string => {
  if (index < 0 || index >= items.length || !isHeaderItem(items[index])) {
    return '00:00:00';
  }

  let totalSeconds = 0;
  let i = index + 1;

  // Sum up durations of non-floated items until next header
  while (i < items.length && !isHeaderItem(items[i])) {
    // Only count non-floated items
    if (!items[i].isFloating && !items[i].isFloated) {
      totalSeconds += timeToSeconds(items[i].duration);
    }
    i++;
  }

  return secondsToTimeString(totalSeconds);
};
