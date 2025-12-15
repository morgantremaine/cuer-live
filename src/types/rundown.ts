
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
  images: string;
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

// Row number locking types for database
export interface RundownNumberingState {
  numbering_locked?: boolean;
  locked_row_numbers?: { [itemId: string]: string };
}

// Helper type guards for better type safety
export const isHeaderItem = (item: RundownItem): boolean => item.type === 'header';
export const isRegularItem = (item: RundownItem): boolean => item.type === 'regular';
