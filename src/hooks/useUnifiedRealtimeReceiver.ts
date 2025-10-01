import { useCallback } from 'react';
import { useUnifiedRealtimeBroadcast, UnifiedOperationPayload } from './useUnifiedRealtimeBroadcast';

/**
 * UNIFIED REALTIME RECEIVER
 * 
 * Listens to all operations on the unified broadcast channel and routes them
 * to appropriate handlers based on operation type.
 * 
 * This ensures all clients receive and process operations consistently.
 */

interface UseUnifiedRealtimeReceiverOptions {
  rundownId: string;
  clientId: string;
  userId: string | undefined;
  onCellEdit?: (operation: UnifiedOperationPayload) => void;
  onStructuralChange?: (operation: UnifiedOperationPayload) => void;
  onMetadataUpdate?: (operation: UnifiedOperationPayload) => void;
  onShowcallerUpdate?: (operation: UnifiedOperationPayload) => void;
}

export const useUnifiedRealtimeReceiver = ({
  rundownId,
  clientId,
  userId,
  onCellEdit,
  onStructuralChange,
  onMetadataUpdate,
  onShowcallerUpdate
}: UseUnifiedRealtimeReceiverOptions) => {
  
  // Route operations to appropriate handlers
  const handleOperation = useCallback((operation: UnifiedOperationPayload) => {
    console.log('🎯 UNIFIED RECEIVER: Routing operation', {
      type: operation.type,
      fromClient: operation.clientId,
      fromUser: operation.userId
    });

    switch (operation.type) {
      case 'CELL_EDIT':
        if (onCellEdit) {
          console.log('📝 UNIFIED RECEIVER: Routing to cell edit handler');
          onCellEdit(operation);
        }
        break;

      case 'ROW_INSERT':
      case 'ROW_DELETE':
      case 'ROW_MOVE':
      case 'ROW_COPY':
        if (onStructuralChange) {
          console.log('🏗️ UNIFIED RECEIVER: Routing to structural change handler');
          onStructuralChange(operation);
        }
        break;

      case 'METADATA_UPDATE':
        if (onMetadataUpdate) {
          console.log('⚙️ UNIFIED RECEIVER: Routing to metadata handler');
          onMetadataUpdate(operation);
        }
        break;

      case 'SHOWCALLER_UPDATE':
        if (onShowcallerUpdate) {
          console.log('🎬 UNIFIED RECEIVER: Routing to showcaller handler');
          onShowcallerUpdate(operation);
        }
        break;

      default:
        console.warn('⚠️ UNIFIED RECEIVER: Unknown operation type', operation.type);
    }
  }, [onCellEdit, onStructuralChange, onMetadataUpdate, onShowcallerUpdate]);

  // Subscribe to unified broadcast
  const { isConnected } = useUnifiedRealtimeBroadcast({
    rundownId,
    clientId,
    userId,
    onOperationReceived: handleOperation
  });

  return {
    isConnected
  };
};
