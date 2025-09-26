import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Auth Token Safety Net - Zero-risk utility for detecting and handling auth errors
 */

// Check if error is related to authentication/token expiry
export const isAuthError = (error: any): boolean => {
  if (!error) return false;
  
  // Check error message patterns
  const message = error.message?.toLowerCase() || '';
  const code = error.code || '';
  
  // Supabase auth error patterns
  if (code === 'PGRST301') return true; // JWT expired
  if (code === 'PGRST302') return true; // JWT invalid
  if (code === '401' || code === '403') return true; // HTTP auth errors
  
  // Message-based detection
  if (message.includes('jwt')) return true;
  if (message.includes('expired')) return true;
  if (message.includes('invalid token')) return true;
  if (message.includes('unauthorized')) return true;
  if (message.includes('forbidden')) return true;
  if (message.includes('authentication')) return true;
  
  return false;
};

// Attempt to refresh the auth session
export const attemptAuthRefresh = async (): Promise<boolean> => {
  try {
    console.log('🔄 Auth Safety Net: Attempting token refresh...');
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.warn('⚠️ Auth Safety Net: Token refresh failed:', error.message);
      return false;
    }
    
    if (data.session) {
      console.log('✅ Auth Safety Net: Token refresh successful');
      return true;
    }
    
    console.warn('⚠️ Auth Safety Net: No session returned from refresh');
    return false;
  } catch (refreshError) {
    console.warn('⚠️ Auth Safety Net: Token refresh threw error:', refreshError);
    return false;
  }
};

// Show auth-specific error toast
export const showAuthErrorToast = () => {
  toast({
    title: "Session expired",
    description: "Please refresh the page to continue saving changes.",
    variant: "destructive",
    duration: 8000,
  });
};

/**
 * Enhanced error handler that detects auth errors and attempts recovery
 * Returns: { shouldRetry: boolean, wasAuthError: boolean }
 */
export const handlePotentialAuthError = async (error: any): Promise<{ shouldRetry: boolean, wasAuthError: boolean }> => {
  if (!isAuthError(error)) {
    return { shouldRetry: false, wasAuthError: false };
  }
  
  console.log('🔍 Auth Safety Net: Auth error detected:', error.message || error);
  
  // Attempt token refresh
  const refreshSuccessful = await attemptAuthRefresh();
  
  if (refreshSuccessful) {
    console.log('✅ Auth Safety Net: Token refreshed - retrying save operation');
    return { shouldRetry: true, wasAuthError: true };
  }
  
  // Token refresh failed - show specific auth error message
  console.log('❌ Auth Safety Net: Token refresh failed - showing auth error toast');
  showAuthErrorToast();
  
  return { shouldRetry: false, wasAuthError: true };
};