
import React from 'react';
import RundownHeader from './RundownHeader';
import RundownMainContent from './RundownMainContent';
import SearchBar from './SearchBar';
import { useSearchAndReplace } from '@/hooks/useSearchAndReplace';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = ({
  currentTime,
  timezone,
  onTimezoneChange,
  totalRuntime,
  showColumnManager,
  setShowColumnManager,
  items,
  visibleColumns,
  columns,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
  isDraggingMultiple,
  dropTargetIndex,
  currentSegmentId,
  hasClipboardData,
  getColumnWidth,
  updateColumnWidth,
  getRowNumber,
  getRowStatus,
  calculateHeaderDuration,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onToggleColorPicker,
  onColorSelect,
  onDeleteRow,
  onToggleFloat,
  onRowSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddRow,
  onAddHeader,
  selectedCount,
  onCopySelectedRows,
  onPasteRows,
  onDeleteSelectedRows,
  onClearSelection,
  selectedRowId,
  isPlaying,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  handleAddColumn,
  handleReorderColumns,
  handleDeleteColumnWithCleanup,
  handleToggleColumnVisibility,
  handleLoadLayout,
  hasUnsavedChanges,
  isSaving,
  rundownTitle,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  rundownId,
  onOpenTeleprompter
}: RundownContainerProps) => {
  const searchAndReplace = useSearchAndReplace(items, visibleColumns);

  const handleReplaceCurrentMatch = () => {
    searchAndReplace.replaceCurrentMatch(onUpdateItem);
  };

  const handleReplaceAllMatches = () => {
    searchAndReplace.replaceAllMatches(onUpdateItem);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <RundownHeader
        currentTime={currentTime}
        timezone={timezone}
        onTimezoneChange={onTimezoneChange}
        totalRuntime={totalRuntime}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        title={rundownTitle}
        onTitleChange={onTitleChange}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={onRundownStartTimeChange}
      />

      <SearchBar
        searchTerm={searchAndReplace.searchTerm}
        replaceTerm={searchAndReplace.replaceTerm}
        currentMatchIndex={searchAndReplace.currentMatchIndex}
        totalMatches={searchAndReplace.totalMatches}
        isReplaceMode={searchAndReplace.isReplaceMode}
        isCaseSensitive={searchAndReplace.isCaseSensitive}
        onSearchTermChange={searchAndReplace.setSearchTerm}
        onReplaceTermChange={searchAndReplace.setReplaceTerm}
        onToggleReplaceMode={searchAndReplace.setIsReplaceMode}
        onToggleCaseSensitive={searchAndReplace.setIsCaseSensitive}
        onNextMatch={searchAndReplace.nextMatch}
        onPreviousMatch={searchAndReplace.previousMatch}
        onReplaceCurrentMatch={handleReplaceCurrentMatch}
        onReplaceAllMatches={handleReplaceAllMatches}
        onClearSearch={searchAndReplace.clearSearch}
      />

      <div className="flex-1 overflow-hidden">
        <RundownMainContent
          items={items}
          visibleColumns={visibleColumns}
          columns={columns}
          currentTime={currentTime}
          showColorPicker={showColorPicker}
          cellRefs={cellRefs}
          selectedRows={selectedRows}
          draggedItemIndex={draggedItemIndex}
          isDraggingMultiple={isDraggingMultiple}
          dropTargetIndex={dropTargetIndex}
          currentSegmentId={currentSegmentId}
          hasClipboardData={hasClipboardData}
          getColumnWidth={getColumnWidth}
          updateColumnWidth={updateColumnWidth}
          getRowNumber={getRowNumber}
          getRowStatus={getRowStatus}
          calculateHeaderDuration={calculateHeaderDuration}
          onUpdateItem={onUpdateItem}
          onCellClick={onCellClick}
          onKeyDown={onKeyDown}
          onToggleColorPicker={onToggleColorPicker}
          onColorSelect={onColorSelect}
          onDeleteRow={onDeleteRow}
          onToggleFloat={onToggleFloat}
          onRowSelect={onRowSelect}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onCopySelectedRows={onCopySelectedRows}
          onDeleteSelectedRows={onDeleteSelectedRows}
          onPasteRows={onPasteRows}
          onClearSelection={onClearSelection}
          showColumnManager={showColumnManager}
          handleAddColumn={handleAddColumn}
          handleReorderColumns={handleReorderColumns}
          handleDeleteColumnWithCleanup={handleDeleteColumnWithCleanup}
          handleToggleColumnVisibility={handleToggleColumnVisibility}
          handleLoadLayout={handleLoadLayout}
          onCloseColumnManager={() => setShowColumnManager(false)}
        />
      </div>
    </div>
  );
};

export default RundownContainer;
