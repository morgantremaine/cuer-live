
import { v4 as uuidv4 } from 'uuid';
import { RundownItem } from '@/types/rundown';

export const createDefaultRundownItems = (): RundownItem[] => [
  {
    id: uuidv4(),
    name: 'Welcome',
    type: 'segment',
    duration: '00:00:00', // Changed from '00:05:00' to '00:00:00'
    startTime: '',
    endTime: '',
    elapsedTime: '',
    isFloating: false,
    talent: '',
    script: '',
    notes: '',
    gfx: '',
    video: '',
    customFields: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Main Content',
    type: 'segment',
    duration: '00:00:00', // Changed from '00:15:00' to '00:00:00'
    startTime: '',
    endTime: '',
    elapsedTime: '',
    isFloating: false,
    talent: '',
    script: '',
    notes: '',
    gfx: '',
    video: '',
    customFields: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Closing',
    type: 'segment',
    duration: '00:00:00', // Changed from '00:03:00' to '00:00:00'
    startTime: '',
    endTime: '',
    elapsedTime: '',
    isFloating: false,
    talent: '',
    script: '',
    notes: '',
    gfx: '',
    video: '',
    customFields: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
