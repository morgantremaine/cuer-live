
export interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  schema: string;
  table: string;
  commit_timestamp: string;
}

export interface RundownRealtimePayload extends RealtimePayload {
  new: {
    id: string;
    title: string;
    items: any[];
    updated_at: string;
    user_id: string;
  };
}

export interface ShowcallerStatePayload {
  rundownId: string;
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: string;
  userId: string;
  timestamp: string;
}
