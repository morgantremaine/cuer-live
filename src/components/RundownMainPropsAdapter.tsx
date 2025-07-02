
import React from 'react';
import RundownMainContent from './RundownMainContent';

interface RundownMainPropsAdapterProps {
  items: any[];
  columns: any[];
  visibleColumns: any[];
  rundownTitle: string;
  rundownStartTime: string;
  timezone: string;
  currentTime: Date;
  rundownId: string | null;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isConnected: boolean;
  isProcessingRealtimeUpdate: boolean;
  isProcessingShowcallerUpdate?: boolean;
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: number;
  isController: boolean;
  selectedRowId: string | null;
  handleRowSelection: (id: string | null) => void;
  clearRowSelection: () => void;
  totalRuntime: string;
  getRowNumber: (id: string) => number;
  getHeaderDuration: (headerId: string) => string;
  calculateHeaderDuration: (headerId: string) => string;
  updateItem: (id: string, field: string, value: any) => void;
  deleteRow: (id: string) => void;
  toggleFloatRow: (id: string) => void;
  deleteMultipleItems: (ids: string[]) => void;
  addItem: (item: any) => void;
  setTitle: (title: string) => void;
  setStartTime: (startTime: string) => void;
  setTimezone: (timezone: string) => void;
  addRow: () => void;
  addHeader: () => void;
  addRowAtIndex: (index: number) => void;
  addHeaderAtIndex: (index: number) => void;
  addColumn: (column: any) => void;
  updateColumnWidth: (columnId: string, width: number) => void;
  setColumns: (columns: any[]) => void;
  play: (segmentId?: string) => void;
  pause: () => void;
  forward: () => void;
  backward: () => void;
  reset: () => void;
  jumpToSegment: (segmentId?: string) => void;
  undo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  autoScrollEnabled: boolean;
  toggleAutoScroll: () => void;
  [key: string]: any;
}

const RundownMainPropsAdapter = (props: RundownMainPropsAdapterProps) => {
  return <RundownMainContent {...props} />;
};

export default RundownMainPropsAdapter;
