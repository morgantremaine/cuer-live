
import React, { useEffect } from 'react';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import RundownLayoutWrapper from './RundownLayoutWrapper';
import { logger } from '@/utils/logger';

const RundownIndexContent = () => {
  const { coreState, interactions, uiState } = useRundownStateCoordination();

  useEffect(() => {
    logger.log('📊 RundownIndexContent mounted, rundown ID:', coreState.rundownId);
  }, [coreState.rundownId]);

  return (
    <RundownLayoutWrapper
      // Core state
      items={coreState.items}
      columns={coreState.columns}
      visibleColumns={coreState.visibleColumns}
      rundownTitle={coreState.rundownTitle}
      rundownStartTime={coreState.rundownStartTime}
      timezone={coreState.timezone}
      currentTime={coreState.currentTime}
      rundownId={coreState.rundownId}
      
      // State flags
      isLoading={coreState.isLoading}
      hasUnsavedChanges={coreState.hasUnsavedChanges}
      isSaving={coreState.isSaving}
      isConnected={coreState.isConnected}
      isProcessingRealtimeUpdate={coreState.isProcessingRealtimeUpdate}
      isProcessingShowcallerUpdate={coreState.isProcessingShowcallerUpdate}
      
      // Showcaller state
      currentSegmentId={coreState.currentSegmentId}
      isPlaying={coreState.isPlaying}
      timeRemaining={coreState.timeRemaining}
      isController={coreState.isController}
      
      // Selection state - fix the function signature
      selectedRowId={coreState.selectedRowId}
      handleRowSelection={coreState.handleRowSelection}
      clearRowSelection={coreState.clearRowSelection}
      
      // Calculations - fix the function signatures
      totalRuntime={coreState.totalRuntime}
      getRowNumber={coreState.getRowNumber}
      getHeaderDuration={coreState.getHeaderDuration}
      calculateHeaderDuration={coreState.calculateHeaderDuration}
      
      // Core actions
      updateItem={coreState.updateItem}
      deleteRow={coreState.deleteRow}
      toggleFloatRow={coreState.toggleFloatRow}
      deleteMultipleItems={coreState.deleteMultipleItems}
      addItem={coreState.addItem}
      setTitle={coreState.setTitle}
      setStartTime={coreState.setStartTime}
      setTimezone={coreState.setTimezone}
      addRow={coreState.addRow}
      addHeader={coreState.addHeader}
      addRowAtIndex={coreState.addRowAtIndex}
      addHeaderAtIndex={coreState.addHeaderAtIndex}
      
      // Column management
      addColumn={coreState.addColumn}
      updateColumnWidth={coreState.updateColumnWidth}
      setColumns={coreState.setColumns}
      
      // Showcaller controls
      play={coreState.play}
      pause={coreState.pause}
      forward={coreState.forward}
      backward={coreState.backward}
      reset={coreState.reset}
      jumpToSegment={coreState.jumpToSegment}
      
      // Undo functionality
      undo={coreState.undo}
      canUndo={coreState.canUndo}
      lastAction={coreState.lastAction}
      
      // UI interactions
      {...interactions}
      
      // UI state
      {...uiState}
      
      // Autoscroll
      autoScrollEnabled={coreState.autoScrollEnabled}
      toggleAutoScroll={coreState.toggleAutoScroll}
    />
  );
};

export default RundownIndexContent;
