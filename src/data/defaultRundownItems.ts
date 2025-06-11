
import { v4 as uuidv4 } from 'uuid';
import { RundownItem } from '@/types/rundown';

export const createDefaultRundownItems = (): RundownItem[] => [
  {
    id: uuidv4(),
    name: 'Welcome',
    type: 'regular',
    duration: '00:00:00',
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
    type: 'regular',
    duration: '00:00:00',
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
    type: 'regular',
    duration: '00:00:00',
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
