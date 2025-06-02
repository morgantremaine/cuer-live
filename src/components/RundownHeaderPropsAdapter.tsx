
import React, { useState, memo, useMemo } from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import { RundownContainerProps } from '@/types/rundownContainer';
import { SearchHighlight } from '@/types/search';

interface RundownHeaderPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownHeaderPropsAdapter = memo(({ props }: RundownHeaderPropsAdapterProps) => {
  const [currentHighlight, setCurrentHighlight] = useState<SearchHighlight | null>(null);

  // Memoize handlers to prevent unnecessary re-renders
  const handleHighlightMatch = useMemo(() => (itemId: string, field: string, startIndex: number, endIndex: number) => {
    if (!itemId || !field) {
      setCurrentHighlight(null);
      return;
    }

    setCurrentHighlight({
      itemId,
      field,
      startIndex,
      endIndex
    });

    // Focus on the cell
    const cellKey = `${itemId}-${field}`;
    const cellElement = props.cellRefs.current[cellKey];
    if (cellElement) {
      cellElement.focus();
      cellElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [props.cellRefs]);

  const handleReplaceText = useMemo(() => (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => {
    const item = props.items.find(i => i.id === itemId);
    if (!item) return;

    const currentValue = item[field] || '';
    let newValue;

    if (replaceAll) {
      newValue = currentValue.replaceAll(searchText, replaceText);
    } else {
      newValue = currentValue.replace(searchText, replaceText);
    }

    props.onUpdateItem(itemId, field, newValue);
    
    // Clear highlight after replace
    setCurrentHighlight(null);
  }, [props.items, props.onUpdateItem]);

  // Memoize the header props to prevent unnecessary re-renders
  const headerProps = useMemo(() => ({
    rundownTitle: props.rundownTitle,
    currentTime: props.currentTime,
    timezone: props.timezone,
    startTime: props.rundownStartTime,
    currentSegmentId: props.currentSegmentId,
    items: props.items,
    onTimezoneChange: props.onTimezoneChange,
    totalRuntime: props.totalRuntime,
    onAddRow: props.onAddRow,
    onAddHeader: props.onAddHeader,
    onShowColumnManager: () => props.setShowColumnManager(true),
    selectedCount: props.selectedCount,
    hasClipboardData: props.hasClipboardData,
    onCopySelectedRows: props.onCopySelectedRows,
    onPasteRows: props.onPasteRows,
    onDeleteSelectedRows: props.onDeleteSelectedRows,
    onClearSelection: props.onClearSelection,
    selectedRowId: props.selectedRowId,
    isPlaying: props.isPlaying,
    timeRemaining: props.timeRemaining,
    onPlay: props.onPlay,
    onPause: props.onPause,
    onForward: props.onForward,
    onBackward: props.onBackward,
    hasUnsavedChanges: props.hasUnsavedChanges,
    isSaving: props.isSaving,
    onTitleChange: props.onTitleChange,
    rundownStartTime: props.rundownStartTime,
    onRundownStartTimeChange: props.onRundownStartTimeChange,
    rundownId: props.rundownId,
    onOpenTeleprompter: props.onOpenTeleprompter,
    visibleColumns: props.visibleColumns,
    onHighlightMatch: handleHighlightMatch,
    onReplaceText: handleReplaceText,
    currentHighlight
  }), [
    props.rundownTitle,
    props.currentTime,
    props.timezone,
    props.rundownStartTime,
    props.currentSegmentId,
    props.items,
    props.onTimezoneChange,
    props.totalRuntime,
    props.onAddRow,
    props.onAddHeader,
    props.setShowColumnManager,
    props.selectedCount,
    props.hasClipboardData,
    props.onCopySelectedRows,
    props.onPasteRows,
    props.onDeleteSelectedRows,
    props.onClearSelection,
    props.selectedRowId,
    props.isPlaying,
    props.timeRemaining,
    props.onPlay,
    props.onPause,
    props.onForward,
    props.onBackward,
    props.hasUnsavedChanges,
    props.isSaving,
    props.onTitleChange,
    props.onRundownStartTimeChange,
    props.rundownId,
    props.onOpenTeleprompter,
    props.visibleColumns,
    handleHighlightMatch,
    handleReplaceText,
    currentHighlight
  ]);

  return <RundownHeaderSection {...headerProps} />;
});

RundownHeaderPropsAdapter.displayName = 'RundownHeaderPropsAdapter';

export default RundownHeaderPropsAdapter;
