// Per-cell broadcast system for immediate Google Sheets-style sync
interface CellUpdate {
  rundownId: string;
  itemId: string;
  field: string;
  value: any;
  userId: string;
  timestamp: number;
}

class CellBroadcastManager {
  private channels = new Map<string, BroadcastChannel>();
  private callbacks = new Map<string, Set<(update: CellUpdate) => void>>();

  getChannel(rundownId: string): BroadcastChannel {
    if (!this.channels.has(rundownId)) {
      const channel = new BroadcastChannel(`rundown-cells-${rundownId}`);
      this.channels.set(rundownId, channel);
      
      channel.onmessage = (event) => {
        const update: CellUpdate = event.data;
        console.log('📱 Cell broadcast received:', update);
        
        const callbacks = this.callbacks.get(rundownId);
        if (callbacks) {
          callbacks.forEach(callback => callback(update));
        }
      };
    }
    return this.channels.get(rundownId)!;
  }

  broadcastCellUpdate(rundownId: string, itemId: string, field: string, value: any, userId: string) {
    const channel = this.getChannel(rundownId);
    const update: CellUpdate = {
      rundownId,
      itemId,
      field,
      value,
      userId,
      timestamp: Date.now()
    };
    
    console.log('📡 Broadcasting cell update:', update);
    channel.postMessage(update);
  }

  subscribeToCellUpdates(rundownId: string, callback: (update: CellUpdate) => void) {
    if (!this.callbacks.has(rundownId)) {
      this.callbacks.set(rundownId, new Set());
    }
    this.callbacks.get(rundownId)!.add(callback);
    
    // Ensure channel exists
    this.getChannel(rundownId);

    return () => {
      const callbacks = this.callbacks.get(rundownId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(rundownId);
          const channel = this.channels.get(rundownId);
          if (channel) {
            channel.close();
            this.channels.delete(rundownId);
          }
        }
      }
    };
  }

  cleanup(rundownId: string) {
    const channel = this.channels.get(rundownId);
    if (channel) {
      channel.close();
      this.channels.delete(rundownId);
    }
    this.callbacks.delete(rundownId);
  }
}

export const cellBroadcast = new CellBroadcastManager();