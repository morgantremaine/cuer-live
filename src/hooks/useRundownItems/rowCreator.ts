
import { v4 as uuidv4 } from 'uuid';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const createNewRow = (): RundownItem => {
  return {
    id: uuidv4(),
    type: 'regular',
    rowNumber: '',
    name: '',
    segmentName: '',
    talent: '',
    script: '',
    gfx: '',
    video: '',
    duration: '00:00',
    startTime: '',
    endTime: '',
    elapsedTime: '00:00:00',
    notes: '',
    color: '#ffffff',
    isFloating: false,
    customFields: {}
  };
};

export const createNewHeader = (segmentName: string): RundownItem => {
  return {
    id: uuidv4(),
    type: 'header',
    rowNumber: '',
    name: 'New Header',
    segmentName: segmentName,
    talent: '',
    script: '',
    gfx: '',
    video: '',
    duration: '00:00:00',
    startTime: '',
    endTime: '',
    elapsedTime: '00:00:00',
    notes: '',
    color: '#3B82F6',
    isFloating: false,
    customFields: {}
  };
};

export const calculateTimeUpdates = (
  items: RundownItem[],
  targetIndex: number,
  calculateEndTime: (item: RundownItem, prevEndTime?: string) => string
): RundownItem[] => {
  const newItems = [...items];
  
  // Recalculate subsequent times
  for (let i = targetIndex; i < newItems.length; i++) {
    if (!isHeaderItem(newItems[i])) {
      const prevEndTime = i > 0 ? newItems[i - 1]?.endTime || '00:00:00' : '00:00:00';
      newItems[i].startTime = prevEndTime;
      newItems[i].endTime = calculateEndTime(newItems[i], prevEndTime);
    }
  }
  
  return newItems;
};
