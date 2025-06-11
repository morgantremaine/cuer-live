
import { RundownItem } from '@/types/rundown';

export const defaultRundownItems: RundownItem[] = [
  {
    id: '1',
    type: 'header',
    rowNumber: '1',
    name: 'Opening',
    segmentName: 'Opening',
    duration: '00:00:00',
    startTime: '09:00:00',
    endTime: '09:00:00',
    elapsedTime: '00:00:00',
    script: '',
    talent: '',
    gfx: '',
    video: '',
    notes: '',
    color: '#3B82F6',
    isFloating: false,
    customFields: {}
  },
  {
    id: '2',
    type: 'regular',
    rowNumber: '2',
    name: 'Welcome & Introductions',
    segmentName: 'Welcome & Introductions',
    duration: '00:00:00',
    startTime: '09:00:00',
    endTime: '09:00:00',
    elapsedTime: '00:00:00',
    script: '',
    talent: '',
    gfx: '',
    video: '',
    notes: '',
    color: '',
    isFloating: false,
    customFields: {}
  }
];

export const createDefaultRundownItems = (): RundownItem[] => {
  return [...defaultRundownItems];
};
