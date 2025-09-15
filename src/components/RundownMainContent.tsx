
import React from 'react';
import RundownContent from './RundownContent';
import ColumnManager from './ColumnManager';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainContentProps extends RundownContainerProps {
  currentSegmentName: string;
  totalDuration: string;
  savedLayouts: any[]; // Add savedLayouts as a prop
  layoutOperations?: any; // Shared operations from a single hook instance
  onMoveItemUp?: (index: number) => void;
  onMoveItemDown?: (index: number) => void;
}

const RundownMainContent = ({
  showColumnManager,
  setShowColumnManager,
  columns,
  visibleColumns,
  handleAddColumn,
  handleReorderColumns,
  handleDeleteColumnWithCleanup,
  handleRenameColumn,
  handleToggleColumnVisibility,
  handleLoadLayout,
  debugColumns,
  resetToDefaults,
  currentSegmentName,
  totalDuration,
  autoScrollEnabled,
  onToggleAutoScroll,
  savedLayouts, // Accept savedLayouts as prop
  layoutOperations,
  onMoveItemUp,
  onMoveItemDown,
  ...contentProps
}: RundownMainContentProps) => {

  return (
    <>
      <RundownContent 
        {...contentProps}
        visibleColumns={visibleColumns}
        allColumns={columns}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
        onReorderColumns={handleReorderColumns}
        onToggleColumnVisibility={handleToggleColumnVisibility}
        title={contentProps.rundownTitle}
        totalRuntime={totalDuration}
        onMoveItemUp={onMoveItemUp}
        onMoveItemDown={onMoveItemDown}
        items={contentProps.items} // Pass original items for duration calculations
        visibleItems={contentProps.visibleItems} // Pass visible items for display
        savedLayouts={savedLayouts}
        onLoadLayout={handleLoadLayout}
        zoomLevel={contentProps.zoomLevel}
      />
      
      <ColumnManager
        isOpen={showColumnManager}
        columns={columns}
        onClose={() => setShowColumnManager(false)}
        onAddColumn={handleAddColumn}
        onReorderColumns={handleReorderColumns}
        onDeleteColumn={handleDeleteColumnWithCleanup}
        onRenameColumn={handleRenameColumn}
        onToggleColumnVisibility={handleToggleColumnVisibility}
        onLoadLayout={handleLoadLayout}
        debugColumns={debugColumns}
        resetToDefaults={resetToDefaults}
        savedLayouts={savedLayouts}
        layoutOperations={layoutOperations}
      />
    </>
  );
};

export default RundownMainContent;
