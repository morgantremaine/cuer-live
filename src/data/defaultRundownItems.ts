
import { v4 as uuidv4 } from 'uuid';
import { RundownItem, HeaderItem, SegmentItem } from '@/types/rundown';

export const defaultRundownItems: RundownItem[] = [
  {
    id: uuidv4(),
    type: 'header',
    name: '',
    isFloating: false,
    color: '#3b82f6',
    customFields: {}
  } as HeaderItem,
  {
    id: uuidv4(),
    type: 'segment',
    name: '',
    duration: '00:00:00',
    startTime: '09:00:00',
    endTime: '09:00:00',
    talent: '',
    script: '',
    notes: '',
    status: 'upcoming',
    isFloating: false,
    color: '#ffffff',
    customFields: {}
  } as SegmentItem,
  {
    id: uuidv4(),
    type: 'segment',
    name: '',
    duration: '00:00:00',
    startTime: '09:00:00',
    endTime: '09:00:00',
    talent: '',
    script: '',
    notes: '',
    status: 'upcoming',
    isFloating: false,
    color: '#ffffff',
    customFields: {}
  } as SegmentItem,
  {
    id: uuidv4(),
    type: 'segment',
    name: '',
    duration: '00:00:00',
    startTime: '09:00:00',
    endTime: '09:00:00',
    talent: '',
    script: '',
    notes: '',
    status: 'upcoming',
    isFloating: false,
    color: '#ffffff',
    customFields: {}
  } as SegmentItem,
  {
    id: uuidv4(),
    type: 'segment',
    name: '',
    duration: '00:00:00',
    startTime: '09:00:00',
    endTime: '09:00:00',
    talent: '',
    script: '',
    notes: '',
    status: 'upcoming',
    isFloating: false,
    color: '#ffffff',
    customFields: {}
  } as SegmentItem
];
