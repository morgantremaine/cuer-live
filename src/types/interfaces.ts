
import { RundownItem } from './rundown';
import { Column } from '@/hooks/useColumnsManager';

export interface CoreRundownState {
  // Core data
  items: RundownItem[];
  columns: Column[];
  visibleColumns: Column[];
  rundownTitle: string;
  rundownStartTime: string;
  timezone: string;
  currentTime: Date;
  rundownId: string | null;
  
  // State flags
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isConnected: boolean;
  isProcessingRealtimeUpdate: boolean;
  
  // Playback state
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: number;
  isController: boolean;
  showcallerActivity: boolean;
  
  // Selection state
  selectedRowId: string | null;
  handleRowSelection: (itemId: string) => void;
  clearRowSelection: () => void;
  
  // Calculations
  totalRuntime: string;
  getRowNumber: (index: number) => string;
  getHeaderDuration: (id: string) => string;
  calculateHeaderDuration: (index: number) => string;
  
  // Core actions
  updateItem: (id: string, field: string, value: string) => void;
  deleteRow: (id: string) => void;
  toggleFloatRow: (id: string) => void;
  deleteMultipleItems: (ids: string[]) => void;
  addItem: (item: RundownItem, insertIndex?: number) => void;
  setTitle: (title: string) => void;
  setStartTime: (startTime: string) => void;
  setTimezone: (timezone: string) => void;
  addRow: () => void;
  addHeader: () => void;
  addRowAtIndex: (insertIndex: number) => void;
  addHeaderAtIndex: (insertIndex: number) => void;
  
  // Column management
  addColumn: (column: Column) => void;
  updateColumnWidth: (columnId: string, width: string) => void;
  
  // Playbook controls
  play: (selectedSegmentId?: string) => void;
  pause: () => void;
  forward: () => void;
  backward: () => void;
  
  // Undo functionality
  undo: () => void;
  canUndo: boolean;
  lastAction: string | null;
}

export interface RundownInteractions {
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  handleDragStart: (index: number, itemId: string) => void;
  handleDragOver: (index: number) => void;
  handleDragLeave: () => void;
  handleDrop: (targetIndex: number) => void;
  hasClipboardData: () => boolean;
  handleCopySelectedRows: () => void;
  handlePasteRows: () => void;
  handleDeleteSelectedRows: () => void;
  handleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  clearSelection: () => void;
  toggleRowSelection: (itemId: string) => void;
  handleAddRow: () => void;
  handleAddHeader: () => void;
}

export interface RundownUIState {
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  handleToggleColorPicker: (itemId: string | null) => void;
  selectColor: (id: string, color: string) => void;
  getRowStatus: (item: RundownItem) => string;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  handleCellClick: (itemId: string, field: string, event: React.MouseEvent) => void;
  handleKeyDown: (event: React.KeyboardEvent, itemId: string, field: string, itemIndex: number) => void;
}

export interface UnifiedRundownState {
  coreState: CoreRundownState;
  interactions: RundownInteractions;
  uiState: RundownUIState;
}

