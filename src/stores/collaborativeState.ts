/**
 * Collaborative State Store
 * 
 * Zustand store for managing collaborative editing state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  Operation, 
  EditSession, 
  CollaborativeSnapshot,
  ConflictResolutionConfig 
} from '@/lib/operationalTransform/types';
import { RundownOTEngine } from '@/lib/operationalTransform/engine';

interface CollaborativeState {
  // Core OT engine
  otEngine: RundownOTEngine | null;
  
  // Current user and session
  userId: string | null;
  isInitialized: boolean;
  
  // Active edit sessions
  activeSessions: EditSession[];
  myActiveSessions: string[]; // session IDs for current user
  
  // Pending operations
  pendingOperations: Operation[];
  acknowledgedOperations: Operation[];
  
  // Conflict resolution
  activeConflicts: any[];
  conflictResolutionConfig: ConflictResolutionConfig;
  
  // UI state
  showCollaborationIndicators: boolean;
  showConflictDialog: boolean;
  
  // Actions
  initialize: (userId: string, rundownData: any, config?: Partial<ConflictResolutionConfig>) => void;
  cleanup: () => void;
  
  // Session management
  startEditSession: (targetId: string, field: string, initialValue?: any) => string;
  endEditSession: (sessionId: string) => void;
  updateSessionActivity: (sessionId: string, value?: any) => void;
  
  // Operation handling
  submitOperation: (operation: Operation) => Promise<{ success: boolean; conflicts?: any[] }>;
  acknowledgeOperation: (operationId: string) => void;
  
  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: 'prefer_local' | 'prefer_remote' | 'merge') => void;
  updateConflictConfig: (config: Partial<ConflictResolutionConfig>) => void;
  
  // UI actions
  setShowCollaborationIndicators: (show: boolean) => void;
  setShowConflictDialog: (show: boolean) => void;
  
  // Data access
  getSnapshot: () => CollaborativeSnapshot | null;
  isFieldBeingEdited: (targetId: string, field: string) => boolean;
  getActiveSessionsForTarget: (targetId: string) => EditSession[];
}

export const useCollaborativeStore = create<CollaborativeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    otEngine: null,
    userId: null,
    isInitialized: false,
    activeSessions: [],
    myActiveSessions: [],
    pendingOperations: [],
    acknowledgedOperations: [],
    activeConflicts: [],
    conflictResolutionConfig: {
      textConflicts: 'prefer_latest',
      fieldConflicts: 'prefer_latest',
      structuralConflicts: 'prefer_latest',
      autoResolveTimeout: 5000
    },
    showCollaborationIndicators: true,
    showConflictDialog: false,

    // Initialize the collaborative system
    initialize: (userId: string, rundownData: any, config?: Partial<ConflictResolutionConfig>) => {
      const otEngine = new RundownOTEngine(config);
      
      // Set up callbacks
      otEngine.setCallbacks({
        onOperationApplied: (operation, result) => {
          console.log('✅ Operation applied:', operation.type, result);
          // Update UI to reflect changes
        },
        
        onConflictDetected: (conflict) => {
          console.log('⚠️ Conflict detected:', conflict);
          set(state => ({
            activeConflicts: [...state.activeConflicts, conflict],
            showConflictDialog: true
          }));
        },
        
        onSessionUpdated: (session) => {
          set(state => ({
            activeSessions: state.activeSessions.map(s => 
              s.userId === session.userId && 
              s.targetId === session.targetId && 
              s.field === session.field ? session : s
            )
          }));
        }
      });

      // Register this client
      otEngine.registerClient(userId);
      otEngine.setRundownData(rundownData);

      set({
        otEngine,
        userId,
        isInitialized: true,
        conflictResolutionConfig: { ...get().conflictResolutionConfig, ...config }
      });
    },

    // Cleanup when unmounting
    cleanup: () => {
      const { otEngine, userId } = get();
      if (otEngine && userId) {
        otEngine.unregisterClient(userId);
      }
      
      set({
        otEngine: null,
        userId: null,
        isInitialized: false,
        activeSessions: [],
        myActiveSessions: [],
        pendingOperations: [],
        acknowledgedOperations: [],
        activeConflicts: []
      });
    },

    // Start editing a field
    startEditSession: (targetId: string, field: string, initialValue?: any) => {
      const { otEngine, userId } = get();
      if (!otEngine || !userId) return '';

      const sessionId = otEngine.startEditSession(userId, targetId, field, initialValue);
      
      set(state => ({
        myActiveSessions: [...state.myActiveSessions, sessionId]
      }));
      
      return sessionId;
    },

    // End editing a field
    endEditSession: (sessionId: string) => {
      const { otEngine } = get();
      if (!otEngine) return;

      otEngine.endEditSession(sessionId);
      
      set(state => ({
        myActiveSessions: state.myActiveSessions.filter(id => id !== sessionId)
      }));
    },

    // Update session activity
    updateSessionActivity: (sessionId: string, value?: any) => {
      const { otEngine } = get();
      if (!otEngine) return;

      otEngine.updateSessionActivity(sessionId, value);
    },

    // Submit an operation
    submitOperation: async (operation: Operation) => {
      const { otEngine, userId } = get();
      if (!otEngine || !userId) {
        return { success: false };
      }

      try {
        const result = await otEngine.submitOperation(userId, operation);
        
        if (result.success) {
          set(state => ({
            pendingOperations: state.pendingOperations.filter(
              op => !(op.id.userId === operation.id.userId && op.id.sequence === operation.id.sequence)
            ),
            acknowledgedOperations: [...state.acknowledgedOperations, operation]
          }));
        }
        
        return result;
      } catch (error) {
        console.error('Failed to submit operation:', error);
        return { success: false };
      }
    },

    // Acknowledge an operation
    acknowledgeOperation: (operationId: string) => {
      const { otEngine, userId } = get();
      if (!otEngine || !userId) return;

      otEngine.acknowledgeOperations(userId, [operationId]);
    },

    // Resolve a conflict
    resolveConflict: (conflictId: string, resolution: 'prefer_local' | 'prefer_remote' | 'merge') => {
      set(state => ({
        activeConflicts: state.activeConflicts.filter(c => c.id !== conflictId)
      }));
      
      // If no more conflicts, hide dialog
      const remainingConflicts = get().activeConflicts;
      if (remainingConflicts.length === 0) {
        set({ showConflictDialog: false });
      }
    },

    // Update conflict resolution configuration
    updateConflictConfig: (config: Partial<ConflictResolutionConfig>) => {
      set(state => ({
        conflictResolutionConfig: { ...state.conflictResolutionConfig, ...config }
      }));
    },

    // UI actions
    setShowCollaborationIndicators: (show: boolean) => {
      set({ showCollaborationIndicators: show });
    },

    setShowConflictDialog: (show: boolean) => {
      set({ showConflictDialog: show });
    },

    // Get current snapshot
    getSnapshot: () => {
      const { otEngine } = get();
      return otEngine ? otEngine.getSnapshot() : null;
    },

    // Check if field is being edited
    isFieldBeingEdited: (targetId: string, field: string) => {
      const { otEngine, userId } = get();
      if (!otEngine) return false;
      
      return otEngine.isFieldBeingEdited(targetId, field, userId);
    },

    // Get active sessions for a target
    getActiveSessionsForTarget: (targetId: string) => {
      const { otEngine } = get();
      return otEngine ? otEngine.getActiveSessions(targetId) : [];
    }
  }))
);

// Selectors for easy access to specific parts of state
export const useOTEngine = () => useCollaborativeStore(state => state.otEngine);
export const useActiveSessions = () => useCollaborativeStore(state => state.activeSessions);
export const useActiveConflicts = () => useCollaborativeStore(state => state.activeConflicts);
export const useCollaborationIndicators = () => useCollaborativeStore(state => state.showCollaborationIndicators);
export const useConflictDialog = () => useCollaborativeStore(state => state.showConflictDialog);

// Actions selectors
export const useCollaborativeActions = () => useCollaborativeStore(state => ({
  initialize: state.initialize,
  cleanup: state.cleanup,
  startEditSession: state.startEditSession,
  endEditSession: state.endEditSession,
  updateSessionActivity: state.updateSessionActivity,
  submitOperation: state.submitOperation,
  resolveConflict: state.resolveConflict,
  isFieldBeingEdited: state.isFieldBeingEdited,
  getActiveSessionsForTarget: state.getActiveSessionsForTarget
}));