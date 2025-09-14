import { supabase } from '@/integrations/supabase/client';
import { TimeoutManager } from './realtimeUtils';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';

interface WatchdogConfig {
  rundownId: string;
  userId: string;
  onStaleData: (latestData: any) => void;
  checkInterval?: number;
  maxStaleTime?: number;
  onReconnect?: () => void;
}

class RealtimeWatchdog {
  private static instances = new Map<string, RealtimeWatchdog>();
  private timeoutManager = new TimeoutManager();
  private config: WatchdogConfig;
  private isActive = false;
  private lastSeenDocVersion = 0;
  private lastKnownTimestamp: string | null = null;
  private consecutiveFailures = 0;
  private maxFailures = 3;

  constructor(config: WatchdogConfig) {
    this.config = {
      checkInterval: 10000, // Check every 10 seconds
      maxStaleTime: 30000, // Consider stale after 30 seconds
      ...config
    };
  }

  static getInstance(rundownId: string, userId: string, config: Partial<WatchdogConfig> = {}): RealtimeWatchdog {
    const key = `${rundownId}-${userId}`;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, new RealtimeWatchdog({
        rundownId,
        userId,
        ...config
      } as WatchdogConfig));
    }
    
    return this.instances.get(key)!;
  }

  static cleanup(rundownId: string, userId: string) {
    const key = `${rundownId}-${userId}`;
    const instance = this.instances.get(key);
    if (instance) {
      instance.stop();
      this.instances.delete(key);
    }
  }

  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🔍 Starting realtime watchdog for rundown (DISABLED FOR TYPING PROTECTION):', this.config.rundownId);
    
    // Keep disabled to avoid typing interference
    // this.scheduleCheck();
    // this.setupFocusListeners();
  }

  stop() {
    this.isActive = false;
    this.timeoutManager.clearAll();
    this.removeFocusListeners();
    console.log('🛑 Stopped realtime watchdog for rundown:', this.config.rundownId);
  }

  updateLastSeen(docVersion?: number, timestamp?: string) {
    if (docVersion && docVersion > this.lastSeenDocVersion) {
      this.lastSeenDocVersion = docVersion;
    }
    if (timestamp) {
      this.lastKnownTimestamp = timestamp;
    }
    this.consecutiveFailures = 0; // Reset failures on successful update
  }

  private scheduleCheck() {
    if (!this.isActive) return;
    
    this.timeoutManager.set('watchdog-check', () => {
      this.performCheck('scheduled');
      this.scheduleCheck(); // Schedule next check
    }, this.config.checkInterval!);
  }

  private async performCheck(source: string) {
    if (!this.isActive) return;
    
    // Skip watchdog checks for demo rundown
    if (this.config.rundownId === DEMO_RUNDOWN_ID) {
      console.log('📋 Skipping watchdog check for demo rundown');
      return;
    }
    
    try {
      console.log(`🔍 Watchdog check (${source}) for rundown:`, this.config.rundownId);
      
      const { data, error } = await supabase
        .from('rundowns')
        .select('id, updated_at, doc_version, items, title, showcaller_state')
        .eq('id', this.config.rundownId)
        .single();

      if (error) {
        console.warn('⚠️ Watchdog check failed:', error);
        this.handleFailure();
        return;
      }

      if (data) {
        const serverDocVersion = data.doc_version || 0;
        const serverTimestamp = data.updated_at;
        
        // Check if we've missed updates based on doc_version
        if (serverDocVersion > this.lastSeenDocVersion) {
          console.log('🚨 Watchdog detected stale data:', {
            serverDocVersion,
            lastSeenDocVersion: this.lastSeenDocVersion,
            timeDiff: this.lastKnownTimestamp ? 
              new Date(serverTimestamp).getTime() - new Date(this.lastKnownTimestamp).getTime() : 'unknown'
          });
          
          this.config.onStaleData(data);
          this.updateLastSeen(serverDocVersion, serverTimestamp);
        } else {
          // Data is up to date
          this.consecutiveFailures = 0;
        }
      }
    } catch (error) {
      console.error('❌ Watchdog check error:', error);
      this.handleFailure();
    }
  }

  private handleFailure() {
    this.consecutiveFailures++;
    
    if (this.consecutiveFailures >= this.maxFailures) {
      console.warn('🚨 Multiple watchdog failures detected, triggering reconnect');
      this.config.onReconnect?.();
      this.consecutiveFailures = 0; // Reset after triggering reconnect
    }
  }

  private onFocusResume = () => {
    if (this.isActive) {
      console.log('👁️ Tab resumed, performing watchdog check');
      this.performCheck('focus-resume');
    }
  };

  private onVisibilityChange = () => {
    if (!document.hidden && this.isActive) {
      console.log('👁️ Tab visible, performing watchdog check');
      this.performCheck('visibility-change');
    }
  };

  private onOnline = () => {
    if (this.isActive) {
      console.log('🌐 Network restored, performing watchdog check');
      this.performCheck('online');
    }
  };

  private setupFocusListeners() {
    window.addEventListener('focus', this.onFocusResume);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('online', this.onOnline);
  }

  private removeFocusListeners() {
    window.removeEventListener('focus', this.onFocusResume);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('online', this.onOnline);
  }
}

export { RealtimeWatchdog };