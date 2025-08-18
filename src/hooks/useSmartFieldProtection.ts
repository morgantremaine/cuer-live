import { useRef, useCallback, useEffect } from 'react';

interface FieldProtectionEntry {
  fieldKey: string;
  startTime: number;
  lastActivity: number;
  isTyping: boolean;
}

interface UseSmartFieldProtectionProps {
  baseProtectionMs?: number;
  maxProtectionMs?: number;
  typingExtensionMs?: number;
}

export const useSmartFieldProtection = ({
  baseProtectionMs = 3000,
  maxProtectionMs = 10000, 
  typingExtensionMs = 2000
}: UseSmartFieldProtectionProps = {}) => {
  const protectedFieldsRef = useRef<Map<string, FieldProtectionEntry>>(new Map());
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const cleanupIntervalRef = useRef<NodeJS.Timeout>();

  // Start protection for a field
  const protectField = useCallback((fieldKey: string, isTyping: boolean = false) => {
    const now = Date.now();
    const existing = protectedFieldsRef.current.get(fieldKey);
    
    const entry: FieldProtectionEntry = {
      fieldKey,
      startTime: existing?.startTime || now,
      lastActivity: now,
      isTyping
    };
    
    protectedFieldsRef.current.set(fieldKey, entry);
    
    console.log(`🛡️ [Smart] Field protection started:`, {
      fieldKey,
      isTyping,
      protectionTime: baseProtectionMs
    });

    // Clear any existing typing timeout for this field
    const existingTimeout = typingTimeoutRef.current.get(fieldKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set typing timeout if this is a typing field
    if (isTyping) {
      const timeout = setTimeout(() => {
        const currentEntry = protectedFieldsRef.current.get(fieldKey);
        if (currentEntry) {
          currentEntry.isTyping = false;
          console.log(`🛡️ [Smart] Typing ended for field:`, fieldKey);
        }
        typingTimeoutRef.current.delete(fieldKey);
      }, typingExtensionMs);
      
      typingTimeoutRef.current.set(fieldKey, timeout);
    }
  }, [baseProtectionMs, typingExtensionMs]);

  // Update activity for a field (extends protection for typing fields)
  const updateFieldActivity = useCallback((fieldKey: string) => {
    const entry = protectedFieldsRef.current.get(fieldKey);
    if (entry && entry.isTyping) {
      entry.lastActivity = Date.now();
      
      // Reset typing timeout
      const existingTimeout = typingTimeoutRef.current.get(fieldKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(() => {
        const currentEntry = protectedFieldsRef.current.get(fieldKey);
        if (currentEntry) {
          currentEntry.isTyping = false;
          console.log(`🛡️ [Smart] Typing timeout for field:`, fieldKey);
        }
        typingTimeoutRef.current.delete(fieldKey);
      }, typingExtensionMs);
      
      typingTimeoutRef.current.set(fieldKey, timeout);
    }
  }, [typingExtensionMs]);

  // Check if a field is currently protected
  const isFieldProtected = useCallback((fieldKey: string): boolean => {
    const entry = protectedFieldsRef.current.get(fieldKey);
    if (!entry) return false;

    const now = Date.now();
    const timeSinceStart = now - entry.startTime;
    const timeSinceActivity = now - entry.lastActivity;

    // Calculate protection time based on field state
    let protectionTime = baseProtectionMs;
    
    if (entry.isTyping) {
      // Extend protection for actively typing fields, but cap at max
      protectionTime = Math.min(
        baseProtectionMs + (timeSinceStart * 0.5), // Gradually extend
        maxProtectionMs
      );
    }

    const isProtected = timeSinceActivity < protectionTime;
    
    if (!isProtected) {
      console.log(`🛡️ [Smart] Field protection expired:`, {
        fieldKey,
        timeSinceActivity,
        protectionTime,
        wasTyping: entry.isTyping
      });
    }

    return isProtected;
  }, [baseProtectionMs, maxProtectionMs]);

  // Get all currently protected fields
  const getProtectedFields = useCallback((): Set<string> => {
    const protectedFields = new Set<string>();
    const now = Date.now();
    
    protectedFieldsRef.current.forEach((entry, fieldKey) => {
      if (isFieldProtected(fieldKey)) {
        protectedFields.add(fieldKey);
      }
    });
    
    return protectedFields;
  }, [isFieldProtected]);

  // Remove protection from a field
  const unprotectField = useCallback((fieldKey: string) => {
    protectedFieldsRef.current.delete(fieldKey);
    
    const timeout = typingTimeoutRef.current.get(fieldKey);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutRef.current.delete(fieldKey);
    }
    
    console.log(`🛡️ [Smart] Field protection removed:`, fieldKey);
  }, []);

  // Cleanup expired protections periodically
  const cleanupExpiredProtections = useCallback(() => {
    const toRemove: string[] = [];
    
    protectedFieldsRef.current.forEach((entry, fieldKey) => {
      if (!isFieldProtected(fieldKey)) {
        toRemove.push(fieldKey);
      }
    });
    
    toRemove.forEach(fieldKey => {
      protectedFieldsRef.current.delete(fieldKey);
      
      const timeout = typingTimeoutRef.current.get(fieldKey);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutRef.current.delete(fieldKey);
      }
    });
    
    if (toRemove.length > 0) {
      console.log(`🛡️ [Smart] Cleaned up ${toRemove.length} expired protections`);
    }
  }, [isFieldProtected]);

  // Set up periodic cleanup
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(cleanupExpiredProtections, 5000);
    
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      
      // Clear all timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [cleanupExpiredProtections]);

  // Get protection statistics for debugging
  const getProtectionStats = useCallback(() => {
    const entries = Array.from(protectedFieldsRef.current.values());
    const now = Date.now();
    
    return {
      totalProtected: entries.length,
      activelyTyping: entries.filter(e => e.isTyping).length,
      averageAge: entries.length > 0 ? 
        entries.reduce((sum, e) => sum + (now - e.startTime), 0) / entries.length : 0,
      oldestProtection: entries.length > 0 ? 
        Math.max(...entries.map(e => now - e.startTime)) : 0
    };
  }, []);

  return {
    protectField,
    updateFieldActivity,
    isFieldProtected,
    getProtectedFields,
    unprotectField,
    getProtectionStats
  };
};