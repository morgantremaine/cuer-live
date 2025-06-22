
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
  currentSegmentName,
  totalDuration,
  autoScrollEnabled,
  onToggleAutoScroll,
  calculateHeaderDuration,
  ...contentProps
}: RundownMainContentProps) => {

  // Create wrapper to match the expected signature for RundownContent
  const calculateHeaderDurationWrapper = (index: number) => {
    return calculateHeaderDuration(index.toString());
  };

  return (
    <>
      <RundownContent 
        {...contentProps}
        visibleColumns={visibleColumns}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
        calculateHeaderDuration={calculateHeaderDurationWrapper}
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
        />
      )}
    </>
  );
};

export default RundownMainContent;
