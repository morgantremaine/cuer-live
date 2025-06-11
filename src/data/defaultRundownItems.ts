
import { RundownItem } from '@/types/rundown';

export const defaultRundownItems: RundownItem[] = [
  {
    id: '1',
    type: 'header',
    segmentName: 'Opening',
    duration: '00:00:00',
    startTime: '09:00:00',
    endTime: '09:00:00',
    elapsedTime: '00:00:00',
    script: '',
    talent: '',
    notes: '',
    color: '#3B82F6',
    isFloating: false,
    customFields: {}
  },
  {
    id: '2',
    type: 'regular',
    segmentName: 'Welcome & Introductions',
    duration: '00:00:00',
    startTime: '09:00:00',
    endTime: '09:00:00',
    elapsedTime: '00:00:00',
    script: '',
    talent: '',
    notes: '',
    color: '',
    isFloating: false,
    customFields: {}
  }
];
