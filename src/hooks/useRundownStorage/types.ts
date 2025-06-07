
export interface SavedColumn {
  id: string;
  name: string;
  key: string;
  width: number;
  order: number;
  type: 'text' | 'number' | 'time' | 'boolean' | 'tags';
  isEditable: boolean;
  isVisible: boolean;
}

export interface RundownItem {
  id: string;
  name: string;
  type: 'segment' | 'header';
  duration: string;
  script?: string;
  startTime?: string;
  endTime?: string;
  elapsedTime?: string;
  isRunning?: boolean;
  isFloating?: boolean;
  isFloated?: boolean;
  color?: string;
  notes?: string;
  status?: 'upcoming' | 'current' | 'completed';
  [key: string]: any;
}

export interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  lastPlayStartTime?: number;
}

export interface SavedRundown {
  id: string;
  user_id: string;
  title: string;
  items: any[];
  columns?: any[];
  timezone?: string;
  start_time?: string;
  team_id?: string;
  teams?: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  undo_history?: any[];
  showcaller_state?: ShowcallerState;
  icon?: string;
  visibility?: string;
  creator_profile?: {
    full_name: string;
    email: string;
  } | null;
}
