
import React from 'react';
import RundownHeader from './RundownHeader';

interface RundownHeaderPropsAdapterProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  items: any[];
  visibleColumns: any[];
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
}

const RundownHeaderPropsAdapter = (props: RundownHeaderPropsAdapterProps) => {
  return <RundownHeader {...props} />;
};

export default RundownHeaderPropsAdapter;
