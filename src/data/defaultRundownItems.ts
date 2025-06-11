
import { v4 as uuidv4 } from 'uuid';
import { RundownItem } from '@/types/rundown';

export const createDefaultRundownItems = (): RundownItem[] => [
  {
    id: uuidv4(),
    type: 'header',
    rowNumber: 'A',
    name: 'Opening',
    startTime: '09:00:00',
    duration: '00:00:00',
    endTime: '09:00:00',
    elapsedTime: '00:00:00',
    talent: '',
    script: '',
    gfx: '',
    video: '',
    notes: 'Welcome & Opening Segment',
    color: '', // Ensure empty color for consistent header styling
    isFloating: false
  },
  {
    id: '2',
    type: 'regular',
    rowNumber: 'A1',
    name: 'Intro',
    startTime: '09:00:00',
    duration: '00:02:00',
    endTime: '09:02:00',
    elapsedTime: '00:00:00',
    talent: 'Host',
    script: 'Welcome to the show...',
    gfx: '',
    video: '',
    notes: '',
    color: '',
    isFloating: false
  },
  {
    id: '3',
    type: 'regular',
    rowNumber: 'A2',
    name: 'Main Story',
    startTime: '09:02:00',
    duration: '00:05:00',
    endTime: '09:07:00',
    elapsedTime: '00:00:00',
    talent: 'Reporter',
    script: 'Today\'s main story...',
    gfx: 'Lower Third',
    video: 'Package',
    notes: '',
    color: '',
    isFloating: false
  },
  {
    id: '4',
    type: 'regular',
    rowNumber: 'A3',
    name: 'Closing',
    startTime: '09:07:00',
    duration: '00:01:00',
    endTime: '09:08:00',
    elapsedTime: '00:00:00',
    talent: 'Host',
    script: 'Thank you for watching...',
    gfx: '',
    video: '',
    notes: '',
    color: '',
    isFloating: false
  }
];
