
import { RundownItem } from './rundown';
import { Column } from '@/hooks/useColumnsManager';
import React from 'react';

export interface UnifiedRundownState {
  // Basic state
  currentTime: Date;
  timezone: string;
  rundownTitle: string;
  rundownStartTime: string;
  rundownId: string;
  
  // Items and columns
  items: RundownItem[];
  columns: Column[];
  visibleColumns: Column[];
  
  // UI state
  showColumnManager: boolean;
  showColorPicker: boolean;
  selectedRows: Set<string>;
  currentSegmentId: string | null;
  
  // Drag and drop
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  
  // Clipboard
  hasClipboardData: boolean;
  
  // Playback
  isPlaying: boolean;
  timeRemaining: number;
  
  // Save state
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  
  // Undo
  canUndo: boolean;
  lastAction: string | null;
  
  // Collaboration
  hasRemoteUpdates: boolean;
  
  // Refs
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>;
}

export interface RundownStateHandlers {
  // Basic handlers
  onTimezoneChange: (timezone: string) => void;
  onTitleChange: (title: string) => void;
  onRundownStartTimeChange: (time: string) => void;
  setShowColumnManager: (show: boolean) => void;
  
  // Item handlers
  onUpdateItem: (id: string, field: string, value: any) => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  
  // Selection handlers - Fixed signature to match implementation
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onClearSelection: () => void;
  
  // Clipboard handlers
  onCopySelectedRows: () => void;
  onPasteRows: () => void;
  onDeleteSelectedRows: () => void;
  
  // UI handlers
  onCellClick: (itemId: string, field: string, event: React.MouseEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onToggleColorPicker: (itemId?: string) => void;
  onColorSelect: (id: string, color: string) => void;
  
  // Drag handlers
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragLeave: () => void;
  onDrop: (targetIndex: number) => void;
  
  // Column handlers
  handleAddColumn: (name: string, type: string) => void;
  handleReorderColumns: (startIndex: number, endIndex: number) => void;
  handleDeleteColumn: (id: string) => void;
  handleRenameColumn: (id: string, newName: string) => void;
  handleToggleColumnVisibility: (id: string) => void;
  handleLoadLayout: (columns: Column[]) => void;
  
  // Playback handlers
  onPlay: () => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  
  // Utility handlers
  onOpenTeleprompter: () => void;
  onUndo: () => void;
  clearRemoteUpdatesIndicator: () => void;
  
  // Calculation functions
  getColumnWidth: (columnId: string) => number;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem) => 'past' | 'current' | 'upcoming';
  calculateHeaderDuration: (headerIndex: number) => string;
  calculateTotalRuntime: () => string;
}
