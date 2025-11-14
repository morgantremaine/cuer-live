/**
 * ReliabilityManager - Single source of reliability for rundowns
 * 
 * Philosophy: Defensively redundant, not perfectly efficient
 * - Periodic version checks (every 30s)
 * - Full state sync on mismatch
 * - Preserve only actively focused cell
 * - No complex reconnection logic
 * - No sleep detection
 * - No WebSocket health checks
 */

import { supabase } from '@/integrations/supabase/client';
import { connectionState } from './ConnectionState';
import { toast } from 'sonner';

interface RundownVersion {
  id: string;
  doc_version: number;
  updated_at: string;
}

class ReliabilityManager {
  private intervals = new Map<string, number>();
  private knownVersions = new Map<string, number>();
  private activeRundownId: string | null = null;
  private focusedCellKey: string | null = null;

  private CHECK_INTERVAL = 30000; // 30 seconds
  private VISIBILITY_CHECK_DELAY = 2000; // 2 seconds after tab becomes visible

  constructor() {
    // Check on visibility change (tab becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.activeRundownId) {
        console.log('📱 Tab visible - checking rundown version');
        setTimeout(() => this.checkVersion(this.activeRundownId!), this.VISIBILITY_CHECK_DELAY);
      }
    });
  }

  /**
   * Start monitoring a rundown
   */
  startMonitoring(rundownId: string, currentVersion: number) {
    this.activeRundownId = rundownId;
    this.knownVersions.set(rundownId, currentVersion);

    // Clear any existing interval
    this.stopMonitoring(rundownId);

    // Start periodic version check
    const intervalId = window.setInterval(() => {
      this.checkVersion(rundownId);
    }, this.CHECK_INTERVAL);

    this.intervals.set(rundownId, intervalId);

    console.log(`✅ ReliabilityManager monitoring rundown ${rundownId} (v${currentVersion})`);
  }

  /**
   * Stop monitoring a rundown
   */
  stopMonitoring(rundownId: string) {
    const intervalId = this.intervals.get(rundownId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(rundownId);
    }
    this.knownVersions.delete(rundownId);
    
    if (this.activeRundownId === rundownId) {
      this.activeRundownId = null;
    }
  }

  /**
   * Set the currently focused cell (to preserve during sync)
   */
  setFocusedCell(cellKey: string | null) {
    this.focusedCellKey = cellKey;
  }

  /**
   * Check if server version matches our known version
   */
  private async checkVersion(rundownId: string) {
    const knownVersion = this.knownVersions.get(rundownId);
    if (knownVersion === undefined) return;

    try {
      connectionState.setState({ lastCheck: Date.now() });

      const { data, error } = await supabase
        .from('rundowns')
        .select('id, doc_version, updated_at')
        .eq('id', rundownId)
        .single<RundownVersion>();

      if (error || !data) {
        console.warn('⚠️ Version check failed:', error);
        connectionState.setState({ status: 'disconnected' });
        return;
      }

      const serverVersion = data.doc_version || 0;

      if (serverVersion > knownVersion) {
        console.warn(`🔄 Version mismatch detected! Known: v${knownVersion}, Server: v${serverVersion}`);
        await this.fullSync(rundownId, data);
      } else {
        // Versions match - we're good
        connectionState.setState({ status: 'connected' });
      }
    } catch (error) {
      console.error('❌ Version check error:', error);
      connectionState.setState({ status: 'disconnected' });
    }
  }

  /**
   * Perform full state sync from server
   * Preserves only the actively focused cell
   */
  private async fullSync(rundownId: string, versionData: RundownVersion) {
    console.log('🔄 Performing full state sync...');
    connectionState.setState({ status: 'syncing' });

    try {
      // Fetch complete rundown state
      const { data: rundown, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', rundownId)
        .single();

      if (error || !rundown) {
        console.error('❌ Full sync failed:', error);
        connectionState.setState({ status: 'disconnected' });
        return;
      }

      // Update known version
      this.knownVersions.set(rundownId, versionData.doc_version);

      // Dispatch full sync event with focused cell info
      const event = new CustomEvent('rundown-full-sync', {
        detail: {
          rundownId,
          rundown,
          preserveCellKey: this.focusedCellKey
        }
      });
      window.dispatchEvent(event);

      connectionState.setState({ 
        status: 'connected',
        lastSync: Date.now() 
      });

      toast.success('Synced with latest version');
      console.log(`✅ Full sync complete - now at v${versionData.doc_version}`);
    } catch (error) {
      console.error('❌ Full sync error:', error);
      connectionState.setState({ status: 'disconnected' });
      toast.error('Failed to sync - please refresh');
    }
  }

  /**
   * Force an immediate version check
   */
  forceCheck(rundownId: string) {
    console.log('🔍 Force checking version...');
    this.checkVersion(rundownId);
  }

  /**
   * Update known version after a successful save
   */
  updateKnownVersion(rundownId: string, newVersion: number) {
    this.knownVersions.set(rundownId, newVersion);
    console.log(`📝 Known version updated to v${newVersion}`);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals.clear();
    this.knownVersions.clear();
    this.activeRundownId = null;
    this.focusedCellKey = null;
  }
}

export const reliabilityManager = new ReliabilityManager();
