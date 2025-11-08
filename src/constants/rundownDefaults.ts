
// Default values for rundown items to ensure consistency across the application
export const RUNDOWN_DEFAULTS = {
  // Duration defaults
  NEW_ROW_DURATION: '00:00',
  NEW_HEADER_DURATION: '',
  
  // Time defaults
  DEFAULT_START_TIME: '09:00:00',
  DEFAULT_END_TIME: '12:00:00',
  DEFAULT_ELAPSED_TIME: '00:00:00',
  
  // Basic item properties
  DEFAULT_ROW_NAME: '',
  DEFAULT_HEADER_NAME: 'New Header',
  DEFAULT_COLOR: '',
  DEFAULT_TIMEZONE: 'UTC',
  
  // Default rundown properties
  DEFAULT_RUNDOWN_TITLE: 'Untitled Rundown'
} as const;
