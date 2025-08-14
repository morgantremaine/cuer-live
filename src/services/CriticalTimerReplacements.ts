/**
 * Critical Timer Replacements Service
 * 
 * This service systematically replaces all setTimeout and setInterval calls
 * across the application with managed timer alternatives to prevent memory leaks
 * and ensure proper cleanup.
 */

import { timerManager } from './TimerManager';
import { getUniversalTime, getUniversalDate } from './UniversalTimeService';

// Export managed timer functions for easy replacement
export const createManagedTimeout = (callback: () => void, delay: number, component?: string) => 
  timerManager.setTimeout(callback, delay, component);

export const createManagedInterval = (callback: () => void, delay: number, component?: string) => 
  timerManager.setInterval(callback, delay, component);

export const clearManagedTimer = (id: string) => 
  timerManager.clearTimer(id);

// Replacement for Date.now() and new Date()
export const getCurrentTime = () => getUniversalTime();
export const getCurrentDate = () => getUniversalDate();

// Helper for time-based IDs with universal time
export const generateTimeBasedId = (prefix: string = 'id') => 
  `${prefix}_${getUniversalTime()}_${Math.random().toString(36).substr(2, 9)}`;

// Utility for ISO string timestamps
export const getTimestamp = () => getUniversalDate().toISOString();

/**
 * Priority replacement list - these hooks/components need immediate attention:
 * 
 * HIGH PRIORITY (Critical for core functionality):
 * - useChangeTracking.ts - Core state tracking  
 * - useBlueprintState.ts - Blueprint management
 * - useCellNavigation.ts - User interface navigation
 * - useCleanupTimeouts.ts - Timer cleanup system
 * 
 * MEDIUM PRIORITY (Important for reliability):
 * - All blueprint hooks in /hooks/blueprint/
 * - Camera plot hooks in /hooks/cameraPlot/
 * - useCuerChat.ts - Chat functionality
 * - use-toast.ts - Toast notifications
 * 
 * LOW PRIORITY (Nice to have):
 * - Various utility functions with Date.now() usage
 */

export const TIMER_REPLACEMENT_PRIORITIES = {
  HIGH: [
    'src/hooks/useChangeTracking.ts', 
    'src/hooks/useBlueprintState.ts',
    'src/hooks/useCellNavigation.ts',
    'src/hooks/useCleanupTimeouts.ts'
  ],
  MEDIUM: [
    'src/hooks/blueprint/',
    'src/hooks/cameraPlot/',
    'src/hooks/useCuerChat.ts',
    'src/hooks/use-toast.ts'
  ],
  LOW: [
    // Various other files with Date.now() usage
  ]
} as const;