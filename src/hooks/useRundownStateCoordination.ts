
import { useParams } from 'react-router-dom';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridHandlers } from './useRundownGridHandlers';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useSimpleAutoSave } from './useSimpleAutoSave';

export const useRundownStateCoordination = () => {
  const params = useParams<{ id: string }>();
  const urlRundownId = (!params.id || params.id === 'new' || params.id === ':id' || params.id.trim() === '') ? null : params.id;
  
  // Basic state management
  const basicState = useRundownBasicState();
  
  // Auto-save with effective rundown ID tracking
  const { isSaving, setUndoActive, effectiveRundownId } = useSimpleAutoSave(
    basicState.state,
    urlRundownId,
    basicState.onSaved
  );
  
  // Use the effective rundown ID (either URL param or created ID)
  const actualRundownId = effectiveRundownId || urlRundownId;
  
  console.log('🔍 Rundown ID coordination:', {
    urlParam: urlRundownId,
    effective: effectiveRundownId,
    actual: actualRundownId
  });

  // Grid core functionality
  const gridCore = useRundownGridCore({
    items: basicState.state.items,
    columns: basicState.state.columns,
    rundownId: actualRundownId, // Use actual ID
    setItems: basicState.actions.setItems,
    setColumns: basicState.actions.setColumns,
    markAsChanged: basicState.actions.markAsChanged,
    currentTime: basicState.state.currentTime,
    currentSegmentId: basicState.state.currentSegmentId,
    setUndoActive
  });

  // Grid handlers
  const gridHandlers = useRundownGridHandlers({
    items: basicState.state.items,
    setItems: basicState.actions.setItems,
    markAsChanged: basicState.actions.markAsChanged,
    rundownId: actualRundownId, // Use actual ID
    columns: basicState.state.columns,
    setColumns: basicState.actions.setColumns,
    setUndoActive
  });

  // Grid interactions
  const gridInteractions = useRundownGridInteractions({
    items: basicState.state.items,
    setItems: basicState.actions.setItems,
    markAsChanged: basicState.actions.markAsChanged,
    calculateEndTime: gridCore.calculations.calculateEndTime
  });

  return {
    coreState: {
      // Pass the actual rundown ID to all components
      rundownId: actualRundownId,
      urlRundownId, // Keep original for reference
      effectiveRundownId,
      ...basicState.state,
      ...gridCore.state,
      ...gridHandlers.state,
      ...gridCore.calculations,
      ...basicState.actions,
      ...gridCore.actions,
      ...gridHandlers.actions,
      isSaving,
      hasUnsavedChanges: basicState.state.hasUnsavedChanges && !isSaving
    },
    interactions: {
      ...gridInteractions
    },
    uiState: {
      ...gridCore.ui
    }
  };
};
