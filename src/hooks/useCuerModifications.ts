
import { useSimplifiedRundownState } from '@/hooks/useSimplifiedRundownState';
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export const useCuerModifications = () => {
  // Use the SAME simplified state that the UI uses to prevent sync issues
  const simplifiedState = useSimplifiedRundownState();

  console.log('🤖 useCuerModifications initialized with simplified state:', {
    itemCount: simplifiedState.items.length,
    rundownId: simplifiedState.rundownId,
    hasUnsavedChanges: simplifiedState.hasUnsavedChanges
  });

  const { applyModifications } = useModificationApplier({
    items: simplifiedState.items,
    updateItem: simplifiedState.updateItem,
    addRow: simplifiedState.addRow,
    addHeader: simplifiedState.addHeader,
    deleteRow: simplifiedState.deleteRow,
    calculateEndTime: (startTime: string, duration: string) => {
      // Simple calculation for Cuer
      const startParts = startTime.split(':').map(Number);
      const durationParts = duration.split(':').map(Number);
      
      let totalSeconds = 0;
      if (startParts.length >= 2) {
        totalSeconds += startParts[0] * 3600 + startParts[1] * 60 + (startParts[2] || 0);
      }
      if (durationParts.length >= 2) {
        totalSeconds += durationParts[0] * 60 + durationParts[1];
      }
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },
    markAsChanged: () => {
      console.log('🤖 Cuer marking as changed');
      // This will be handled by the simplified state internally
    }
  });

  return {
    applyModifications
  };
};
