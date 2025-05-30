
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
  isFloated?: boolean;
  isHeader?: boolean;
  status?: 'upcoming' | 'current' | 'completed';
}
