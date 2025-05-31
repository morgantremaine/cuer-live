
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { useCellNavigation } from '@/hooks/useCellNavigation';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTimeCalculations } from '@/hooks/useTimeCalculations';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useMultiRowSelection } from '@/hooks/useMultiRowSelection';
import { useClipboard } from '@/hooks/useClipboard';
import { usePlaybackControls } from '@/hooks/usePlaybackControls';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

export const useRundownInteractions = (
  visibleColumns: Column[],
  items: RundownItem[],
  setItems: (items: RundownItem[]) => void,
  updateItem: (id: string, field: string, value: string) => void,
  rundownStartTime: string
) => {
  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth
  } = useResizableColumns(visibleColumns);

  const {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(visibleColumns, items);

  const {
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useDragAndDrop(items, setItems);

  const {
    calculateEndTime,
    getRowStatus
  } = useTimeCalculations(items, updateItem, rundownStartTime);

  const {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect: selectColor
  } = useColorPicker();

  const {
    selectedRows,
    toggleRowSelection,
    clearSelection
  } = useMultiRowSelection();

  const {
    clipboardItems,
    copyItems,
    hasClipboardData
  } = useClipboard();

  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(items, updateItem);

  return {
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown,
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    calculateEndTime,
    getRowStatus,
    showColorPicker,
    handleToggleColorPicker,
    selectColor,
    selectedRows,
    toggleRowSelection,
    clearSelection,
    clipboardItems,
    copyItems,
    hasClipboardData,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
  };
};
