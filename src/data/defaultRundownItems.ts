
import { v4 as uuidv4 } from 'uuid';
import { RundownItem } from '@/types/rundown';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';

export const createDefaultRundownItems = (): RundownItem[] => [
  {
    id: uuidv4(),
    name: RUNDOWN_DEFAULTS.DEFAULT_HEADER_NAME,
    type: 'header',
    duration: RUNDOWN_DEFAULTS.NEW_HEADER_DURATION,
    startTime: '00:00:00',
    endTime: '00:00:00',
    elapsedTime: '00:00:00',
    isFloating: false,
    talent: '',
    script: '',
    notes: '',
    gfx: '',
    video: '',
    images: '',
    customFields: {},
    rowNumber: 'A',
    color: ''
  },
  {
    id: uuidv4(),
    name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
    type: 'regular',
    duration: '00:00',
    startTime: '00:00:00',
    endTime: '00:00:00',
    elapsedTime: '00:00:00',
    isFloating: false,
    talent: '',
    script: '',
    notes: '',
    gfx: '',
    video: '',
    images: '',
    customFields: {},
    rowNumber: '',
    color: ''
  },
  {
    id: uuidv4(),
    name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
    type: 'regular',
    duration: '00:00',
    startTime: '00:00:00',
    endTime: '00:00:00',
    elapsedTime: '00:00:00',
    isFloating: false,
    talent: '',
    script: '',
    notes: '',
    gfx: '',
    video: '',
    images: '',
    customFields: {},
    rowNumber: '',
    color: ''
  },
  {
    id: uuidv4(),
    name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
    type: 'regular',
    duration: '00:00',
    startTime: '00:00:00',
    endTime: '00:00:00',
    elapsedTime: '00:00:00',
    isFloating: false,
    talent: '',
    script: '',
    notes: '',
    gfx: '',
    video: '',
    images: '',
    customFields: {},
    rowNumber: '',
    color: ''
  }
];
