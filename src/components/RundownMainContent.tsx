
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
  ...contentProps
}: RundownMainContentProps) => {
  
  // Debug autoscroll props passing
  console.log('🔄 RundownMainContent: Autoscroll props:', {
    autoScrollEnabled,
    hasToggleFunction: !!onToggleAutoScroll,
    currentSegmentId: contentProps.currentSegmentId,
    isPlaying: contentProps.isPlaying
  });

  return (
    <>
      <RundownContent 
        {...contentProps}
        visibleColumns={visibleColumns}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
      />
      
      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onClose={() => setShowColumnManager(false)}
          onAddColumn={handleAddColumn}
          onReorderColumns={handleReorderColumns}
          onDeleteColumn={handleDeleteColumnWithCleanup}
          onRenameColumn={handleRenameColumn}
          onToggleVisibility={handleToggleColumnVisibility}
          onLoadLayout={handleLoadLayout}
        />
      )}
    </>
  );
};

export default RundownMainContent;
