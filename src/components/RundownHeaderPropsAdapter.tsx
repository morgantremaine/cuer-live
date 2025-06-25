
import React from 'react';
import RundownHeader from './RundownHeader';
import { UnifiedRundownState } from '@/types/interfaces';

interface RundownHeaderPropsAdapterProps {
  coreState: UnifiedRundownState;
  interactions: any;
  uiState: any;
}

const RundownHeaderPropsAdapter = ({ coreState, interactions, uiState }: RundownHeaderPropsAdapterProps) => {
  // DEBUG: Log the prop being passed
  console.log('🔗 RundownHeaderPropsAdapter - isVisuallyProcessingTeamUpdate:', coreState.isVisuallyProcessingTeamUpdate);

  return (
    <RundownHeader
      currentTime={coreState.currentTime}
      timezone={coreState.timezone}
      totalRuntime={coreState.totalRuntime}
      hasUnsavedChanges={coreState.hasUnsavedChanges}
      isSaving={coreState.isSaving}
      title={coreState.rundownTitle}
      onTitleChange={coreState.setTitle}
      rundownStartTime={coreState.rundownStartTime}
      onRundownStartTimeChange={coreState.setStartTime}
      items={coreState.items}
      visibleColumns={coreState.visibleColumns}
      onUndo={coreState.undo}
      canUndo={coreState.canUndo}
      lastAction={coreState.lastAction}
      isConnected={coreState.isConnected}
      isProcessingRealtimeUpdate={coreState.isProcessingRealtimeUpdate}
      isVisuallyProcessingTeamUpdate={coreState.isVisuallyProcessingTeamUpdate} // Make sure this is explicitly passed
      isPlaying={coreState.isPlaying}
      currentSegmentId={coreState.currentSegmentId}
      timeRemaining={coreState.timeRemaining}
      autoScrollEnabled={coreState.autoScrollEnabled}
      onToggleAutoScroll={coreState.toggleAutoScroll}
    />
  );
};

export default RundownHeaderPropsAdapter;
