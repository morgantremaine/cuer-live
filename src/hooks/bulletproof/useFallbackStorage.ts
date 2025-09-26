import { useCallback, useRef } from 'react';

interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  method?: 'localStorage' | 'indexedDB' | 'memory';
}

class IndexedDBManager {
  private dbName = 'cuer-fallback-storage';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }

  async setItem(key: string, value: any): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.put({
        key,
        value: JSON.stringify(value),
        timestamp: Date.now()
      });
      
      request.onerror = () => reject(new Error('Failed to store in IndexedDB'));
      request.onsuccess = () => resolve();
    });
  }

  async getItem(key: string): Promise<any> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.get(key);
      
      request.onerror = () => reject(new Error('Failed to retrieve from IndexedDB'));
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          try {
            resolve(JSON.parse(result.value));
          } catch {
            resolve(result.value);
          }
        } else {
          resolve(null);
        }
      };
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.delete(key);
      
      request.onerror = () => reject(new Error('Failed to delete from IndexedDB'));
      request.onsuccess = () => resolve();
    });
  }
}

export const useFallbackStorage = () => {
  const indexedDBManager = useRef(new IndexedDBManager());
  const memoryStorage = useRef<Map<string, any>>(new Map());
  
  const setItem = useCallback(async <T>(key: string, value: T): Promise<StorageResult<T>> => {
    // Try localStorage first
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log('💾 Fallback storage: Stored in localStorage', key);
      return { success: true, data: value, method: 'localStorage' };
    } catch (error) {
      console.warn('⚠️ Fallback storage: localStorage failed', error);
    }

    // Try IndexedDB
    try {
      await indexedDBManager.current.setItem(key, value);
      console.log('💾 Fallback storage: Stored in IndexedDB', key);
      return { success: true, data: value, method: 'indexedDB' };
    } catch (error) {
      console.warn('⚠️ Fallback storage: IndexedDB failed', error);
    }

    // Fall back to memory storage
    try {
      memoryStorage.current.set(key, value);
      console.log('💾 Fallback storage: Stored in memory', key);
      return { success: true, data: value, method: 'memory' };
    } catch (error) {
      console.error('❌ Fallback storage: All storage methods failed', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Storage failed'
      };
    }
  }, []);

  const getItem = useCallback(async <T>(key: string): Promise<StorageResult<T>> => {
    // Try localStorage first
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item);
        console.log('📖 Fallback storage: Retrieved from localStorage', key);
        return { success: true, data: parsed, method: 'localStorage' };
      }
    } catch (error) {
      console.warn('⚠️ Fallback storage: localStorage read failed', error);
    }

    // Try IndexedDB
    try {
      const item = await indexedDBManager.current.getItem(key);
      if (item !== null) {
        console.log('📖 Fallback storage: Retrieved from IndexedDB', key);
        return { success: true, data: item, method: 'indexedDB' };
      }
    } catch (error) {
      console.warn('⚠️ Fallback storage: IndexedDB read failed', error);
    }

    // Try memory storage
    try {
      const item = memoryStorage.current.get(key);
      if (item !== undefined) {
        console.log('📖 Fallback storage: Retrieved from memory', key);
        return { success: true, data: item, method: 'memory' };
      }
    } catch (error) {
      console.warn('⚠️ Fallback storage: Memory read failed', error);
    }

    return { success: false, error: 'Item not found in any storage' };
  }, []);

  const removeItem = useCallback(async (key: string): Promise<StorageResult> => {
    let success = false;
    const results: string[] = [];

    // Remove from localStorage
    try {
      localStorage.removeItem(key);
      results.push('localStorage');
      success = true;
    } catch (error) {
      console.warn('⚠️ Fallback storage: localStorage removal failed', error);
    }

    // Remove from IndexedDB
    try {
      await indexedDBManager.current.removeItem(key);
      results.push('indexedDB');
      success = true;
    } catch (error) {
      console.warn('⚠️ Fallback storage: IndexedDB removal failed', error);
    }

    // Remove from memory storage
    try {
      memoryStorage.current.delete(key);
      results.push('memory');
      success = true;
    } catch (error) {
      console.warn('⚠️ Fallback storage: Memory removal failed', error);
    }

    console.log('🗑️ Fallback storage: Removed from', results.join(', '));
    
    return { 
      success, 
      error: success ? undefined : 'Failed to remove from all storage methods'
    };
  }, []);

  const getStorageHealth = useCallback(async () => {
    const health = {
      localStorage: false,
      indexedDB: false,
      memory: true // Memory is always available
    };

    // Test localStorage
    try {
      const testKey = '__storage_health_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      health.localStorage = true;
    } catch {
      health.localStorage = false;
    }

    // Test IndexedDB
    try {
      await indexedDBManager.current.initDB();
      health.indexedDB = true;
    } catch {
      health.indexedDB = false;
    }

    return health;
  }, []);

  return {
    setItem,
    getItem,
    removeItem,
    getStorageHealth
  };
};