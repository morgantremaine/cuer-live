/**
 * Handles chunk load failures by forcing a page reload to fetch fresh assets.
 * This prevents errors when users have stale HTML after deployments.
 */

let hasReloadedForChunkError = false;

export const handleChunkLoadError = (error: Error, context: string): never => {
  // Prevent infinite reload loops
  if (hasReloadedForChunkError) {
    console.error(`❌ Chunk load failed after reload attempt (${context}):`, error);
    throw error;
  }

  // Check if this is a chunk load error
  const isChunkLoadError = 
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed') ||
    error.message.includes('error loading dynamically imported module');

  if (isChunkLoadError) {
    console.warn(`🔄 Chunk load failed (${context}) - reloading to fetch fresh assets`);
    hasReloadedForChunkError = true;
    
    // Store flag in sessionStorage to prevent loops across reloads
    sessionStorage.setItem('chunk_load_reload', Date.now().toString());
    
    // Force hard reload
    window.location.reload();
    
    // Throw to prevent further execution while reload is happening
    throw new Error('Reloading page to fetch fresh chunks');
  }

  // If it's not a chunk error, rethrow
  throw error;
};

export const shouldSkipChunkReload = (): boolean => {
  const lastReload = sessionStorage.getItem('chunk_load_reload');
  if (!lastReload) return false;
  
  // If we reloaded in the last 10 seconds, skip to prevent loops
  const timeSinceReload = Date.now() - parseInt(lastReload, 10);
  return timeSinceReload < 10000;
};
