
import React, { useState } from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import { RundownContainerProps } from '@/types/rundownContainer';
import { SearchHighlight } from '@/types/search';

interface RundownHeaderPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownHeaderPropsAdapter = ({ props }: RundownHeaderPropsAdapterProps) => {
  const [currentHighlight, setCurrentHighlight] = useState<SearchHighlight | null>(null);

  // Create handlers for search functionality
  const handleHighlightMatch = (itemId: string, field: string, startIndex: number, endIndex: number) => {
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
  };

  const handleReplaceText = (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => {
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
  };

  return (
    <RundownHeaderSection
      currentTime={props.currentTime}
      timezone={props.timezone}
      onTimezoneChange={props.onTimezoneChange}
      totalRuntime={props.totalRuntime}
      onAddRow={props.onAddRow}
      onAddHeader={props.onAddHeader}
      onShowColumnManager={() => props.setShowColumnManager(true)}
      selectedCount={props.selectedCount}
      hasClipboardData={props.hasClipboardData}
      onCopySelectedRows={props.onCopySelectedRows}
      onPasteRows={props.onPasteRows}
      onDeleteSelectedRows={props.onDeleteSelectedRows}
      onClearSelection={props.onClearSelection}
      selectedRowId={props.selectedRowId}
      isPlaying={props.isPlaying}
      currentSegmentId={props.currentSegmentId}
      timeRemaining={props.timeRemaining}
      onPlay={props.onPlay}
      onPause={props.onPause}
      onForward={props.onForward}
      onBackward={props.onBackward}
      hasUnsavedChanges={props.hasUnsavedChanges}
      isSaving={props.isSaving}
      rundownTitle={props.rundownTitle}
      onTitleChange={props.onTitleChange}
      rundownStartTime={props.rundownStartTime}
      onRundownStartTimeChange={props.onRundownStartTimeChange}
      rundownId={props.rundownId}
      onOpenTeleprompter={props.onOpenTeleprompter}
      items={props.items}
      visibleColumns={props.visibleColumns}
      onHighlightMatch={handleHighlightMatch}
      onReplaceText={handleReplaceText}
      currentHighlight={currentHighlight}
    />
  );
};

export default RundownHeaderPropsAdapter;
