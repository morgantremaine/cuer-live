/**
 * Structural Operation Backup Utility
 * 
 * Stores pending structural operations in localStorage as a backup.
 * Enables recovery of unsaved operations if server saves fail completely.
 */

interface BackupOperation {
  rundownId: string;
  operationType: string;
  operationData: any;
  userId: string;
  timestamp: string;
  retryCount?: number;
}

const BACKUP_KEY = 'structural_operations_backup';

export const structuralBackup = {
  /**
   * Save pending operations to localStorage
   */
  save(operations: BackupOperation[]): void {
    try {
      if (operations.length === 0) {
        localStorage.removeItem(BACKUP_KEY);
        return;
      }
      
      const backup = {
        operations,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      console.log('💾 Backed up operations to localStorage:', operations.length);
    } catch (error) {
      console.error('Failed to backup operations:', error);
    }
  },

  /**
   * Load pending operations from localStorage
   */
  load(): { operations: BackupOperation[]; savedAt: string } | null {
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (!backup) return null;
      
      return JSON.parse(backup);
    } catch (error) {
      console.error('Failed to load backup operations:', error);
      return null;
    }
  },

  /**
   * Clear localStorage backup
   */
  clear(): void {
    localStorage.removeItem(BACKUP_KEY);
    console.log('🗑️ Cleared localStorage backup');
  }
};
