
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const calculateHeaderSegmentName = (items: RundownItem[], targetIndex: number): string => {
  let headerCount = 0;
  for (let i = 0; i < targetIndex; i++) {
    if (isHeaderItem(items[i])) {
      headerCount++;
    }
  }
  
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[headerCount] || 'A';
};
