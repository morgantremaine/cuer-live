
export interface RundownItem {
  id: string;
  type: 'regular' | 'header';
  rowNumber: string;
  name: string;
  startTime: string;
  duration: string;
  endTime: string;
  elapsedTime: string;
  talent: string;
  script: string;
  gfx: string;
  video: string;
  notes: string;
  color: string;
  isFloating: boolean;
  // Legacy properties for backward compatibility
  isFloated?: boolean;
  isHeader?: boolean;
  // Additional properties used by components
  customFields?: { [key: string]: string };
  segmentName?: string;
  status?: 'upcoming' | 'current' | 'completed';
}

// Add the missing type aliases for backward compatibility
export type HeaderItem = RundownItem & { type: 'header' };
export type SegmentItem = RundownItem & { type: 'regular' };

// Helper type guards for better type safety
export const isHeaderItem = (item: RundownItem): boolean => item.type === 'header';
export const isRegularItem = (item: RundownItem): boolean => item.type === 'regular';
