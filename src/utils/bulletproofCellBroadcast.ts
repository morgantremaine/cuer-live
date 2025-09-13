import { supabase } from '@/integrations/supabase/client';
import { localShadowStore } from '@/state/localShadows';

export interface BulletproofCellUpdate {
  rundownId: string;
  itemId: string;
  fieldName: string;
  value: any;
  userId: string;
  timestamp: number;
  changeId: string;
}

class BulletproofCellBroadcast {
  private channels = new Map<string, any>();
  private conflictResolver: any = null; // Will be injected by the auto-save system

  // Set conflict resolver from the bulletproof auto-save system
  setConflictResolver(resolver: any) {
    this.conflictResolver = resolver;
  }

  // Broadcast a cell update with bulletproof conflict resolution
  async broadcastCellUpdate(
    rundownId: string, 
    itemId: string, 
    fieldName: string, 
    value: any, 
    userId: string
  ) {
    if (!rundownId || !itemId || !fieldName) {
      console.warn('🚫 Bulletproof broadcast: Invalid parameters');
      return;
    }

    const update: BulletproofCellUpdate = {
      rundownId,
      itemId,
      fieldName,
      value,
      userId,
      timestamp: Date.now(),
      changeId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    console.log('📡 Bulletproof broadcast: Sending protected cell update:', update);

    // Update local shadow to protect against immediate conflicts
    localShadowStore.setShadow(itemId, fieldName, value, true);

    try {
      const channel = this.getOrCreateChannel(rundownId);
      await channel.send({
        type: 'broadcast',
        event: 'bulletproof_cell_update',
        payload: update
      });

      console.log('✅ Bulletproof broadcast: Cell update sent successfully');
    } catch (error) {
      console.error('❌ Bulletproof broadcast: Failed to send cell update:', error);
      
      // On broadcast failure, clear the local shadow to prevent inconsistency
      localShadowStore.markInactive(itemId, fieldName);
    }
  }

  // Subscribe to bulletproof cell updates with conflict resolution
  subscribeToCellUpdates(
    rundownId: string, 
    onUpdate: (update: BulletproofCellUpdate, resolvedValue?: any) => void,
    currentUserId: string
  ) {
    if (!rundownId) {
      console.warn('🚫 Bulletproof broadcast: Cannot subscribe without rundown ID');
      return null;
    }

    console.log('📡 Bulletproof broadcast: Subscribing to protected cell updates:', rundownId);

    const channel = this.getOrCreateChannel(rundownId);
    
    channel.on('broadcast', { event: 'bulletproof_cell_update' }, (payload: { payload: BulletproofCellUpdate }) => {
      const update = payload.payload;
      
      // Skip our own updates
      if (update.userId === currentUserId) {
        console.log('⏭️ Bulletproof broadcast: Skipping own update');
        return;
      }

      console.log('📨 Bulletproof broadcast: Received protected cell update:', update);

      // Check for conflicts using the bulletproof conflict resolution system
      if (this.conflictResolver) {
        const conflict = this.conflictResolver.detectConflict(
          update.itemId,
          update.fieldName,
          update.value,
          update.timestamp
        );

        if (conflict) {
          console.warn('⚠️ Bulletproof broadcast: Conflict detected, resolving...', conflict);
          
          const resolution = this.conflictResolver.resolveConflict(conflict);
          const resolvedValue = this.conflictResolver.applyResolution(conflict, resolution);
          
          console.log('✅ Bulletproof broadcast: Conflict resolved:', resolution.strategy);
          
          // Apply the resolved value instead of the original
          onUpdate(update, resolvedValue);
        } else {
          // No conflict, apply update directly
          console.log('✅ Bulletproof broadcast: No conflict, applying update');
          onUpdate(update, update.value);
        }
      } else {
        // Fallback: apply update directly if no conflict resolver available
        console.log('⚠️ Bulletproof broadcast: No conflict resolver, applying update directly');
        onUpdate(update, update.value);
      }
    });

    return () => {
      console.log('🔌 Bulletproof broadcast: Unsubscribing from cell updates');
      this.removeChannel(rundownId);
    };
  }

  // Get or create a realtime channel for a rundown
  private getOrCreateChannel(rundownId: string) {
    const channelKey = `bulletproof-cells-${rundownId}`;
    
    if (this.channels.has(channelKey)) {
      return this.channels.get(channelKey);
    }

    console.log('🔌 Bulletproof broadcast: Creating new channel:', channelKey);
    
    const channel = supabase.channel(channelKey);
    
    channel.subscribe((status: string) => {
      console.log(`📡 Bulletproof broadcast: Channel ${channelKey} status:`, status);
      
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Bulletproof broadcast: Channel connected: ${channelKey}`);
      } else if (status === 'CLOSED') {
        console.log(`🔌 Bulletproof broadcast: Channel disconnected: ${channelKey}`);
        this.channels.delete(channelKey);
      }
    });

    this.channels.set(channelKey, channel);
    return channel;
  }

  // Remove and cleanup a channel
  private removeChannel(rundownId: string) {
    const channelKey = `bulletproof-cells-${rundownId}`;
    const channel = this.channels.get(channelKey);
    
    if (channel) {
      console.log('🧹 Bulletproof broadcast: Removing channel:', channelKey);
      supabase.removeChannel(channel);
      this.channels.delete(channelKey);
    }
  }

  // Cleanup all channels
  cleanup() {
    console.log('🧹 Bulletproof broadcast: Cleaning up all channels');
    
    for (const [channelKey, channel] of this.channels) {
      supabase.removeChannel(channel);
    }
    
    this.channels.clear();
  }
}

// Export singleton instance
export const bulletproofCellBroadcast = new BulletproofCellBroadcast();