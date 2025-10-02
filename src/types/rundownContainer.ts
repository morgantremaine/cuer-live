import React from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/types/columns';

export interface RundownContainerProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  showColumnManager: boolean;
  setShowColumnManager: (show: boolean) => void;
  items: RundownItem[];
  visibleColumns: Column[];
  columns: Column[];
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem, currentTime: Date) => 'upcoming' | 'current' | 'completed';
  calculateHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onAddRow: () => void;
  onAddMultipleRows?: (count: number, selectedRowId?: string | null, selectedRows?: Set<string>) => void;
  onAddHeader: () => void;
  selectedCount: number;
  hasClipboardData: boolean;
  onCopySelectedRows: () => void;
  onPasteRows: () => void;
  onDeleteSelectedRows: () => void;
  onClearSelection: () => void;
  selectedRowId: string | null;
  isPlaying: boolean;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onReset: () => void;
  handleAddColumn: (name: string) => void;
  handleReorderColumns: (columns: Column[]) => void;
  handleDeleteColumnWithCleanup: (columnId: string) => void;
  handleRenameColumn: (columnId: string, newName: string) => void;
  handleToggleColumnVisibility: (columnId: string, insertIndex?: number) => void;
  handleLoadLayout: (layoutColumns: Column[]) => void;
  debugColumns?: () => void;
  resetToDefaults?: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  rundownTitle: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  showDate?: Date | null;
  onShowDateChange?: (date: Date | null) => void;
  rundownId?: string;
  onOpenTeleprompter: () => void;
  // Undo/Redo functionality
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  onRedo: () => void;
  canRedo: boolean;
  nextRedoAction: string | null;
  
  // Realtime collaboration props
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  hasActiveTeammates?: boolean;
  activeTeammateNames?: string[];
  
  // Jump to here functionality
  onJumpToHere?: (segmentId: string) => void;
  
  // Autoscroll functionality
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  
  // Notes window functionality
  onShowNotes?: () => void;
  
  // Zoom functionality
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  isDefaultZoom?: boolean;
  
  // Header collapse functions
  toggleHeaderCollapse: (headerId: string) => void;
  isHeaderCollapsed: (headerId: string) => boolean;
  getHeaderGroupItemIds: (headerId: string) => string[];
  visibleItems: RundownItem[];
  onMoveItemUp?: (index: number) => void;
  onMoveItemDown?: (index: number) => void;
  
  // @dnd-kit integration
  dragAndDrop?: {
    DndContext: React.ComponentType<any>;
    SortableContext: React.ComponentType<any>;
    sensors: any;
    sortableItems: any[];
    dndKitDragStart: (event: any) => void;
    dndKitDragEnd: (event: any) => void;
    modifiers: any[];
    collisionDetection: any;
    activeId: any;
    resetDragState: () => void;
  };
}
