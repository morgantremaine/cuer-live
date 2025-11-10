// Unified tab identity management for proper own-update detection

let globalTabId: string | null = null;

/**
 * Gets or creates a consistent tab ID for this browser tab
 * This ID persists for the lifetime of the tab and is used to identify
 * updates originating from this specific tab across all systems
 */
export const getTabId = (): string => {
  if (!globalTabId) {
    globalTabId = crypto.randomUUID();
  }
  return globalTabId;
};

/**
 * Reset tab ID (for testing purposes only)
 */
export const resetTabId = (): void => {
  globalTabId = null;
};