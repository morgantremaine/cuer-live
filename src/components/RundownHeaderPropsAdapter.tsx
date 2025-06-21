
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RundownHeader from './RundownHeader';
import { RundownContainerProps } from '@/types/rundownContainer';
import { useAuth } from '@/hooks/useAuth';

interface RundownHeaderPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownHeaderPropsAdapter = ({ props }: RundownHeaderPropsAdapterProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();

  const {
    currentTime,
    timezone,
    onTimezoneChange,
    totalRuntime,
    rundownTitle,
    onTitleChange,
    rundownStartTime,
    onRundownStartTimeChange,
    rundownId,
    hasUnsavedChanges,
    isSaving,
    onUndo,
    canUndo,
    lastAction,
    items,
    visibleColumns,
    isConnected,
    isProcessingRealtimeUpdate,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    autoScrollEnabled,
    onToggleAutoScroll
  } = props;

  // Show back button when we're on a specific rundown page (has an ID)
  const showBackButton = !!id && id !== 'new';

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Debug logging for prop passing
  console.log('🔄 RundownHeaderPropsAdapter: Received props:', {
    autoScrollEnabled,
    hasToggleFunction: !!onToggleAutoScroll,
    toggleFunctionType: typeof onToggleAutoScroll,
    showBackButton,
    rundownId: id
  });

  return (
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
      items={items}
      visibleColumns={visibleColumns}
      onUndo={onUndo}
      canUndo={canUndo}
      lastAction={lastAction}
      isConnected={isConnected}
      isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
      isPlaying={isPlaying}
      currentSegmentId={currentSegmentId}
      timeRemaining={timeRemaining}
      autoScrollEnabled={autoScrollEnabled}
      onToggleAutoScroll={onToggleAutoScroll}
      showBackButton={showBackButton}
      onBack={handleBack}
    />
  );
};

export default RundownHeaderPropsAdapter;
