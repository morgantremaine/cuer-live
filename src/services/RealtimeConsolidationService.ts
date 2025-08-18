/**
 * Consolidated Realtime Service
 * Merges all realtime systems into a single, conflict-aware system
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { stateManager } from './StateManager';
import { getUniversalTime } from './UniversalTimeService';
import { timerManager } from './TimerManager';

interface RealtimeSubscription {
  id: string;
  channel: RealtimeChannel;
  table: string;
  filter?: string;
  callbacks: {
    onInsert?: (payload: any) => void;
    onUpdate?: (payload: any) => void;
    onDelete?: (payload: any) => void;
  };
  lastActivity: number;
  isActive: boolean;
}

interface ConflictResolution {
  strategy: 'latest-wins' | 'user-priority' | 'custom';
  customResolver?: (local: any, remote: any) => any;
}

interface RealtimeOptions {
  conflictResolution?: ConflictResolution;
  offlineSupport?: boolean;
  dedupWindow?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

class RealtimeConsolidationService {
  private subscriptions = new Map<string, RealtimeSubscription>();
  private pendingUpdates = new Map<string, any[]>();
  private isOnline = true;
  private reconnectTimer: string | null = null;
  private heartbeatTimer: string | null = null;
  private options: Required<RealtimeOptions>;

  constructor(options: RealtimeOptions = {}) {
    this.options = {
      conflictResolution: { strategy: 'latest-wins' },
      offlineSupport: true,
      dedupWindow: 1000,
      reconnectDelay: 2000,
      heartbeatInterval: 30000,
      ...options
    };

    this.initializeNetworkMonitoring();
    this.startHeartbeat();
  }

  /**
   * Subscribe to real-time updates for a table
   */
  public subscribe(
    table: string,
    callbacks: RealtimeSubscription['callbacks'],
    filter?: string,
    subscriptionId?: string
  ): string {
    const id = subscriptionId || this.generateSubscriptionId(table, filter);
    
    // Remove existing subscription if it exists
    this.unsubscribe(id);

    const channel = supabase
      .channel(`realtime_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter
        },
        (payload) => this.handleRealtimeEvent(id, payload)
      )
      .subscribe((status) => {
        console.log(`📡 Realtime subscription ${id} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          const subscription = this.subscriptions.get(id);
          if (subscription) {
            subscription.isActive = true;
            subscription.lastActivity = getUniversalTime();
          }
        }
      });

    const subscription: RealtimeSubscription = {
      id,
      channel,
      table,
      filter,
      callbacks,
      lastActivity: getUniversalTime(),
      isActive: false
    };

    this.subscriptions.set(id, subscription);
    console.log(`📡 Created realtime subscription: ${id} for table: ${table}`);
    
    return id;
  }

  /**
   * Unsubscribe from real-time updates
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.channel.unsubscribe();
    this.subscriptions.delete(subscriptionId);
    
    console.log(`📡 Removed realtime subscription: ${subscriptionId}`);
    return true;
  }

  /**
   * Perform database update with conflict resolution
   */
  public async updateWithConflictResolution<T>(
    table: string,
    id: string,
    updates: Partial<T>,
    currentData?: T
  ): Promise<{ data: T | null; error: Error | null }> {
    return stateManager.execute(
      `update_${table}_${id}`,
      async () => {
        // Get latest data from database
        const { data: latestData, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        // Apply conflict resolution if we have both current and latest data
        let finalUpdates = updates;
        if (currentData && latestData && this.hasConflict(currentData, latestData)) {
          finalUpdates = this.resolveConflict(currentData, latestData, updates);
          console.log(`🔄 Conflict resolved for ${table}:${id}`, { 
            current: currentData, 
            latest: latestData, 
            resolved: finalUpdates 
          });
        }

        // Perform the update
        const { data: updatedData, error: updateError } = await supabase
          .from(table)
          .update({
            ...finalUpdates,
            updated_at: new Date(getUniversalTime()).toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return { data: updatedData, error: null };
      },
      `${table}:${id}`
    );
  }

  /**
   * Queue updates for offline processing
   */
  private queueOfflineUpdate(table: string, operation: any): void {
    if (!this.options.offlineSupport) {
      return;
    }

    const key = `offline_${table}`;
    const queue = this.pendingUpdates.get(key) || [];
    queue.push({
      ...operation,
      timestamp: getUniversalTime(),
      id: this.generateOperationId()
    });
    
    this.pendingUpdates.set(key, queue);
    console.log(`📦 Queued offline update for ${table}:`, operation);
  }

  /**
   * Process queued offline updates when coming back online
   */
  private async processOfflineUpdates(): Promise<void> {
    if (this.pendingUpdates.size === 0) {
      return;
    }

    console.log('🔄 Processing offline updates:', this.pendingUpdates.size);

    for (const [key, updates] of this.pendingUpdates.entries()) {
      try {
        // Process updates in chronological order
        const sortedUpdates = updates.sort((a, b) => a.timestamp - b.timestamp);
        
        for (const update of sortedUpdates) {
          await this.processOfflineUpdate(update);
        }
        
        // Clear processed updates
        this.pendingUpdates.delete(key);
      } catch (error) {
        console.error(`Failed to process offline updates for ${key}:`, error);
      }
    }
  }

  /**
   * Process a single offline update
   */
  private async processOfflineUpdate(update: any): Promise<void> {
    // Implement based on operation type
    // This would need to be customized based on your data structure
    console.log('Processing offline update:', update);
  }

  /**
   * Handle incoming realtime events
   */
  private handleRealtimeEvent(subscriptionId: string, payload: any): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.isActive) {
      return;
    }

    subscription.lastActivity = getUniversalTime();

    // Apply deduplication
    if (this.isDuplicateEvent(payload)) {
      console.log('📡 Skipping duplicate realtime event:', payload);
      return;
    }

    // Route to appropriate callback
    const { eventType } = payload;
    switch (eventType) {
      case 'INSERT':
        subscription.callbacks.onInsert?.(payload);
        break;
      case 'UPDATE':
        subscription.callbacks.onUpdate?.(payload);
        break;
      case 'DELETE':
        subscription.callbacks.onDelete?.(payload);
        break;
    }
  }

  /**
   * Check if data has conflicts
   */
  private hasConflict(current: any, latest: any): boolean {
    // Simple timestamp-based conflict detection
    if (current.updated_at && latest.updated_at) {
      return new Date(current.updated_at).getTime() !== new Date(latest.updated_at).getTime();
    }
    return false;
  }

  /**
   * Resolve conflicts between data versions
   */
  private resolveConflict(current: any, latest: any, updates: any): any {
    const { strategy, customResolver } = this.options.conflictResolution;

    switch (strategy) {
      case 'latest-wins':
        return { ...latest, ...updates };
      
      case 'user-priority':
        // Prioritize user changes over automatic updates
        return { ...latest, ...current, ...updates };
      
      case 'custom':
        if (customResolver) {
          return customResolver(current, latest);
        }
        // Fallback to latest-wins
        return { ...latest, ...updates };
      
      default:
        return { ...latest, ...updates };
    }
  }

  /**
   * Check for duplicate events (simple implementation)
   */
  private isDuplicateEvent(payload: any): boolean {
    // This would need more sophisticated deduplication logic
    // based on your specific use case
    return false;
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => {
      console.log('📡 Network online - processing offline updates');
      this.isOnline = true;
      this.processOfflineUpdates();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Network offline - queuing updates');
      this.isOnline = false;
    });

    // Initial state
    this.isOnline = navigator.onLine;
  }

  /**
   * Start heartbeat to maintain connections
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = timerManager.setInterval(() => {
      this.performHeartbeat();
    }, this.options.heartbeatInterval, 'RealtimeConsolidationService');
  }

  /**
   * Perform heartbeat check
   */
  private performHeartbeat(): void {
    const now = getUniversalTime();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [id, subscription] of this.subscriptions.entries()) {
      if (now - subscription.lastActivity > staleThreshold) {
        console.warn(`📡 Stale subscription detected: ${id}`);
        // Reconnect stale subscriptions
        this.reconnectSubscription(id);
      }
    }
  }

  /**
   * Reconnect a subscription
   */
  private async reconnectSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    console.log(`📡 Reconnecting subscription: ${subscriptionId}`);
    
    // Unsubscribe and resubscribe
    subscription.channel.unsubscribe();
    
    // Recreate the subscription
    this.subscribe(
      subscription.table,
      subscription.callbacks,
      subscription.filter,
      subscriptionId
    );
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(table: string, filter?: string): string {
    const filterStr = filter ? `_${filter.replace(/\W+/g, '_')}` : '';
    return `${table}${filterStr}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  public getStats() {
    return {
      activeSubscriptions: Array.from(this.subscriptions.values()).filter(s => s.isActive).length,
      totalSubscriptions: this.subscriptions.size,
      pendingOfflineUpdates: Array.from(this.pendingUpdates.values()).reduce(
        (total, queue) => total + queue.length, 
        0
      ),
      isOnline: this.isOnline,
      subscriptions: Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
        id,
        table: sub.table,
        isActive: sub.isActive,
        lastActivity: sub.lastActivity
      }))
    };
  }

  /**
   * Clean up all subscriptions and timers
   */
  public destroy(): void {
    // Clear all subscriptions
    for (const subscription of this.subscriptions.values()) {
      subscription.channel.unsubscribe();
    }
    this.subscriptions.clear();

    // Clear timers
    if (this.reconnectTimer) {
      timerManager.clearTimer(this.reconnectTimer);
    }
    if (this.heartbeatTimer) {
      timerManager.clearTimer(this.heartbeatTimer);
    }

    // Clear pending updates
    this.pendingUpdates.clear();

    console.log('📡 RealtimeConsolidationService destroyed');
  }
}

// Export singleton instance
export const realtimeService = new RealtimeConsolidationService();