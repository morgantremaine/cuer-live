
import React from 'react';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useGlobalKeyboardControls } from '@/hooks/useGlobalKeyboardControls';
import RundownHeader from './RundownHeader';
import RundownMainContent from './RundownMainContent';
import RundownFooter from './RundownFooter';
import ColumnManager from './ColumnManager';

const RundownGrid = () => {
  const state = useRundownGridState();

  // Add global keyboard controls
  useGlobalKeyboardControls({
    isPlaying: state.isPlaying,
    onPlay: () => {
      if (state.currentSegmentId) {
        state.play();
      }
    },
    onPause: state.pause,
    onForward: state.forward,
    onBackward: state.backward
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <RundownHeader
        rundownTitle={state.rundownTitle}
        setRundownTitle={state.handleTitleChange}
        rundownStartTime={state.rundownStartTime}
        setRundownStartTime={state.setRundownStartTime}
        timezone={state.timezone}
        setTimezone={state.setTimezone}
        hasUnsavedChanges={state.hasUnsavedChanges}
        isSaving={state.isSaving}
        calculateTotalRuntime={state.calculateTotalRuntime}
      />
      
      <RundownMainContent />
      
      <RundownFooter />
      
      {state.showColumnManager && (
        <ColumnManager
          columns={state.columns}
          onAddColumn={state.handleAddColumn}
          onReorderColumns={state.handleReorderColumns}
          onDeleteColumn={state.handleDeleteColumnWithCleanup}
          onToggleVisibility={state.handleToggleColumnVisibility}
          onClose={() => state.setShowColumnManager(false)}
        />
      )}
    </div>
  );
};

export default RundownGrid;
