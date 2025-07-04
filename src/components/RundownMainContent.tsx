
import React from 'react';
import RundownContent from './RundownContent';
import ColumnManager from './ColumnManager';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainContentProps extends RundownContainerProps {
  currentSegmentName: string;
  totalDuration: string;
  numberingSystem?: 'sequential' | 'letter_number';
  onNumberingSystemChange?: (system: 'sequential' | 'letter_number') => void;
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
  numberingSystem = 'sequential',
  onNumberingSystemChange,
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
      />
      
      {showColumnManager && (
        <ColumnManager
          columns={columns}
          numberingSystem={numberingSystem}
          onClose={() => setShowColumnManager(false)}
          onAddColumn={handleAddColumn}
          onReorderColumns={handleReorderColumns}
          onDeleteColumn={handleDeleteColumnWithCleanup}
          onRenameColumn={handleRenameColumn}
          onToggleColumnVisibility={handleToggleColumnVisibility}
          onLoadLayout={handleLoadLayout}
          onNumberingSystemChange={onNumberingSystemChange}
        />
      )}
    </>
  );
};

export default RundownMainContent;
