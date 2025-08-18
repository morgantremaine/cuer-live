import { RundownItem } from '@/types/rundown';
import { v4 as uuidv4 } from 'uuid';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';

/**
 * Creates default rundown items for a new rundown
 * Includes a header and a few blank rows to get users started
 */
export const createDefaultRundownItems = (): RundownItem[] => {
  const headerItem: RundownItem = {
    id: uuidv4(),
    type: 'header',
    rowNumber: 'A',
    name: 'SHOW OPEN',
    startTime: '',
    duration: RUNDOWN_DEFAULTS.NEW_HEADER_DURATION,
    endTime: '',
    elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
    talent: '',
    script: '',
    gfx: '',
    video: '',
    images: '',
    notes: '',
    color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
    isFloating: false,
    customFields: {}
  };

  // Create 3 default rows
  const createDefaultRow = (index: number): RundownItem => ({
    id: uuidv4(),
    type: 'regular',
    rowNumber: (index + 1).toString(),
    name: '',
    startTime: '00:00:00',
    duration: '00:02:00',
    endTime: '00:02:00',
    elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
    talent: '',
    script: '',
    gfx: '',
    video: '',
    images: '',
    notes: '',
    color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
    isFloating: false,
    customFields: {}
  });

  return [
    headerItem,
    createDefaultRow(0),
    createDefaultRow(1),
    createDefaultRow(2)
  ];
};