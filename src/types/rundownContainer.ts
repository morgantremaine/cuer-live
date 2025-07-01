import React from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

export interface RundownContainerProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  rundownTitle: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (time: string) => void;
  rundownId: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  items: any[];
  visibleColumns: any[];
  isConnected: boolean;
  isProcessingRealtimeUpdate: boolean;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: string;
  autoScrollEnabled: boolean;
  onToggleAutoScroll: () => void;
  onSearchOpen?: () => void;
}
