import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attemptsUsed: number;
  authRefreshed?: boolean;
}

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  authRetryEnabled?: boolean;
  onAuthRefresh?: () => void;
}

export const useAuthAwareRetry = () => {
  const lastAuthRefresh = useRef<number>(0);
  const refreshingAuth = useRef<Promise<boolean> | null>(null);

  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Auth check: Session check failed', error);
        return false;
      }

      if (!session) {
        console.warn('⚠️ Auth check: No active session');
        return false;
      }

      // Check if token is close to expiry (within 5 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const timeUntilExpiry = (expiresAt * 1000) - Date.now();
        if (timeUntilExpiry < 300000) { // 5 minutes
          console.warn('⚠️ Auth check: Token expires soon', new Date(expiresAt * 1000));
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Auth check: Exception during auth check', error);
      return false;
    }
  }, []);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    // Prevent multiple concurrent refreshes
    if (refreshingAuth.current) {
      console.log('⏳ Auth refresh: Already refreshing, waiting...');
      return await refreshingAuth.current;
    }

    // Rate limit auth refreshes (max once per 30 seconds)
    const now = Date.now();
    if (now - lastAuthRefresh.current < 30000) {
      console.log('⏳ Auth refresh: Rate limited, skipping refresh');
      return false;
    }

    refreshingAuth.current = (async () => {
      try {
        console.log('🔄 Auth refresh: Attempting to refresh session');
        
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('❌ Auth refresh: Refresh failed', error);
          return false;
        }

        if (!data.session) {
          console.error('❌ Auth refresh: No session returned');
          return false;
        }

        lastAuthRefresh.current = now;
        console.log('✅ Auth refresh: Session refreshed successfully');
        return true;
        
      } catch (error) {
        console.error('❌ Auth refresh: Exception during refresh', error);
        return false;
      } finally {
        refreshingAuth.current = null;
      }
    })();

    return await refreshingAuth.current;
  }, []);

  const retryWithAuth = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> => {
    const {
      maxAttempts = 3,
      baseDelayMs = 1000,
      maxDelayMs = 10000,
      authRetryEnabled = true,
      onAuthRefresh
    } = options;

    let attemptsUsed = 0;
    let authRefreshed = false;
    
    while (attemptsUsed < maxAttempts) {
      attemptsUsed++;
      
      try {
        console.log(`🔄 Auth retry: Attempt ${attemptsUsed}/${maxAttempts}`);
        
        const result = await operation();
        console.log('✅ Auth retry: Operation successful');
        
        return {
          success: true,
          data: result,
          attemptsUsed,
          authRefreshed
        };
        
      } catch (error) {
        console.error(`❌ Auth retry: Attempt ${attemptsUsed} failed`, error);
        
        // Check if this is an auth-related error
        const isAuthError = error instanceof Error && (
          error.message.includes('JWT') ||
          error.message.includes('expired') ||
          error.message.includes('unauthorized') ||
          error.message.includes('invalid_token') ||
          error.message.includes('session_not_found')
        );

        // If it's an auth error and we haven't tried refreshing yet, try once
        if (isAuthError && authRetryEnabled && !authRefreshed && attemptsUsed < maxAttempts) {
          console.log('🔑 Auth retry: Auth error detected, attempting refresh');
          
          const refreshSuccess = await refreshAuth();
          
          if (refreshSuccess) {
            authRefreshed = true;
            onAuthRefresh?.();
            console.log('🔑 Auth retry: Auth refreshed, retrying operation');
            continue; // Don't increment delay for auth refresh attempts
          } else {
            console.error('🔑 Auth retry: Auth refresh failed');
          }
        }

        // If this is the last attempt, return failure
        if (attemptsUsed >= maxAttempts) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            attemptsUsed,
            authRefreshed
          };
        }

        // Calculate exponential backoff delay with jitter
        const baseDelay = Math.min(baseDelayMs * Math.pow(2, attemptsUsed - 1), maxDelayMs);
        const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
        const delay = Math.floor(baseDelay + jitter);
        
        console.log(`⏳ Auth retry: Waiting ${delay}ms before next attempt`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: 'Max retry attempts reached',
      attemptsUsed,
      authRefreshed
    };
  }, [checkAuthStatus, refreshAuth]);

  const executeWithAuthRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const result = await retryWithAuth(operation, options);
    
    if (result.success) {
      return result.data!;
    } else {
      throw new Error(result.error || 'Operation failed after retries');
    }
  }, [retryWithAuth]);

  return {
    checkAuthStatus,
    refreshAuth,
    retryWithAuth,
    executeWithAuthRetry
  };
};