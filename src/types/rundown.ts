
export interface RundownItem {
  id: string;
  type: 'regular' | 'header';
  rowNumber: string;
  name: string;
  startTime: string;
  duration: string;
  endTime: string;
  talent: string;
  notes: string;
  color: string;
  isFloating: boolean;
  // Additional properties used by components
  customFields?: { [key: string]: string };
  segmentName?: string;
  status?: 'upcoming' | 'current' | 'completed';
}

// Helper type guards for better type safety
export const isHeaderItem = (item: RundownItem): boolean => item.type === 'header';
export const isRegularItem = (item: RundownItem): boolean => item.type === 'regular';
