import { useRef, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  source: string;
  startedAt: number;
  lastUpdatedAt?: string; // Track when data was last updated
}

// Global coordinator to prevent race conditions in state loading
class StateLoadingCoordinator {
  private loadingStates = new Map<string, LoadingState>();
  private loadingQueue: Array<{ rundownId: string; source: string; loader: () => Promise<void> }> = [];
  private isProcessingQueue = false;

  isLoading(rundownId: string): boolean {
    return this.loadingStates.has(rundownId);
  }

  getCurrentSource(rundownId: string): string | null {
    const state = this.loadingStates.get(rundownId);
    return state?.source || null;
  }

  async startLoading(rundownId: string, source: string, loader: () => Promise<void>, dataTimestamp?: string): Promise<boolean> {
    // If already loading from same source, skip
    const current = this.loadingStates.get(rundownId);
    if (current?.source === source) {
      console.log(`🔒 StateLoadingCoordinator: Skipping duplicate load from ${source} for rundown ${rundownId}`);
      return false;
    }

    // Check if we have stale data - if realtime data is newer than database load attempt, skip database load
    if (source === 'useSimplifiedRundownState' && current?.source === 'realtime' && current.lastUpdatedAt && dataTimestamp) {
      const realtimeTime = new Date(current.lastUpdatedAt).getTime();
      const dbTime = new Date(dataTimestamp).getTime();
      
      if (realtimeTime > dbTime) {
        console.log(`🚫 StateLoadingCoordinator: Skipping stale database load - realtime data is newer (${current.lastUpdatedAt} > ${dataTimestamp})`);
        return false;
      }
    }

    // If loading from different source, queue it
    if (current) {
      console.log(`🔒 StateLoadingCoordinator: Queueing load from ${source} for rundown ${rundownId} (currently loading from ${current.source})`);
      this.loadingQueue.push({ rundownId, source, loader });
      return false;
    }

    // Start loading
    console.log(`🔒 StateLoadingCoordinator: Starting load from ${source} for rundown ${rundownId}`);
    this.loadingStates.set(rundownId, {
      isLoading: true,
      source,
      startedAt: Date.now(),
      lastUpdatedAt: dataTimestamp
    });

    try {
      await loader();
      console.log(`✅ StateLoadingCoordinator: Completed load from ${source} for rundown ${rundownId}`);
    } catch (error) {
      console.error(`❌ StateLoadingCoordinator: Failed load from ${source} for rundown ${rundownId}:`, error);
    } finally {
      this.loadingStates.delete(rundownId);
      // Process queue immediately after completing
      setTimeout(() => this.processQueue(), 0);
    }

    return true;
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.loadingQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 StateLoadingCoordinator: Processing queue with ${this.loadingQueue.length} items`);

    while (this.loadingQueue.length > 0) {
      const next = this.loadingQueue.shift();
      if (!next) break;

      console.log(`🔄 StateLoadingCoordinator: Processing queued load from ${next.source} for ${next.rundownId}`);

      // Check if rundown is still loading
      if (!this.loadingStates.has(next.rundownId)) {
        await this.startLoading(next.rundownId, next.source, next.loader);
      } else {
        console.log(`⚠️ StateLoadingCoordinator: Skipping queued item - rundown ${next.rundownId} is still loading`);
      }
    }

    this.isProcessingQueue = false;
    console.log(`✅ StateLoadingCoordinator: Queue processing complete`);
  }

  // Emergency cleanup for stuck loading states
  cleanup(rundownId: string) {
    console.log(`🧹 StateLoadingCoordinator: Cleaning up loading state for rundown ${rundownId}`);
    this.loadingStates.delete(rundownId);
    this.loadingQueue = this.loadingQueue.filter(item => item.rundownId !== rundownId);
  }

  // Mark realtime update timestamp
  markRealtimeUpdate(rundownId: string, timestamp: string) {
    this.loadingStates.set(rundownId, {
      isLoading: false,
      source: 'realtime',
      startedAt: Date.now(),
      lastUpdatedAt: timestamp
    });
  }
}

// Global instance
const globalCoordinator = new StateLoadingCoordinator();

export const useStateLoadingCoordinator = (rundownId: string | null) => {
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  const startCoordinatedLoad = useCallback(async (
    source: string, 
    loader: () => Promise<void>,
    dataTimestamp?: string
  ): Promise<boolean> => {
    if (!rundownId) return false;

    // Clear any pending cleanup
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    const wasStarted = await globalCoordinator.startLoading(rundownId, source, loader, dataTimestamp);

    // Schedule cleanup for stuck states (after 30 seconds)
    if (wasStarted) {
      cleanupTimeoutRef.current = setTimeout(() => {
        console.warn(`⚠️ StateLoadingCoordinator: Cleaning up potentially stuck loading state for ${source}`);
        globalCoordinator.cleanup(rundownId);
      }, 30000);
    }

    return wasStarted;
  }, [rundownId]);

  const isLoadingFromSource = useCallback((source: string): boolean => {
    if (!rundownId) return false;
    return globalCoordinator.getCurrentSource(rundownId) === source;
  }, [rundownId]);

  const isCurrentlyLoading = useCallback((): boolean => {
    if (!rundownId) return false;
    return globalCoordinator.isLoading(rundownId);
  }, [rundownId]);

  const getCurrentLoadingSource = useCallback((): string | null => {
    if (!rundownId) return null;
    return globalCoordinator.getCurrentSource(rundownId);
  }, [rundownId]);

  const forceCleanup = useCallback(() => {
    if (rundownId) {
      globalCoordinator.cleanup(rundownId);
    }
  }, [rundownId]);

  const markRealtimeUpdate = useCallback((timestamp: string) => {
    if (rundownId) {
      globalCoordinator.markRealtimeUpdate(rundownId, timestamp);
    }
  }, [rundownId]);

  return {
    startCoordinatedLoad,
    isLoadingFromSource,
    isCurrentlyLoading,
    getCurrentLoadingSource,
    forceCleanup,
    markRealtimeUpdate
  };
};