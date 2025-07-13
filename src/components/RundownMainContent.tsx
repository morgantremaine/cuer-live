
import React from 'react';
import RundownContent from './RundownContent';
import ColumnManager from './ColumnManager';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainContentProps extends RundownContainerProps {
  currentSegmentName: string;
  totalDuration: string;
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
  ...contentProps
}: RundownMainContentProps) => {

  return (
    <>
      <RundownContent 
        {...contentProps}
        visibleColumns={visibleColumns}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
        onReorderColumns={handleReorderColumns}
        title={contentProps.rundownTitle}
        totalRuntime={totalDuration}
        items={contentProps.items} // Pass original items for duration calculations
        visibleItems={contentProps.visibleItems} // Pass visible items for display
      />
      
      {showColumnManager && (
        <ColumnManager
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
        />
      )}
    </>
  );
};

export default RundownMainContent;
