import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearInvalidTokens } from '@/utils/invitationUtils'
import { logger } from '@/utils/logger'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string, inviteCode?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updatePassword: (password: string) => Promise<{ error: any }>
  updateProfile: (fullName: string) => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  resendConfirmation: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  // Initialize auth state only once
  useEffect(() => {
    logger.debug('Initializing auth state...');
    
    let loadingTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // Set up auth state listener first
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mountedRef.current) return;
          
          logger.debug('Auth state changed', { event, userEmail: session?.user?.email || 'no user' });
          
          // Clear any existing timeout
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
          }
          
          // Update user state
          setUser(session?.user ?? null);
          
          // Always set loading to false when we have a definitive auth state
          setLoading(false);
          
          // Clean up invalid tokens when user signs in
          if (session?.user && event === 'SIGNED_IN') {
            setTimeout(() => clearInvalidTokens(), 500);
          }
        });

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mountedRef.current) {
          if (error) {
            logger.error('Error getting initial session', error);
          } else {
            logger.debug('Initial session', { userEmail: session?.user?.email || 'no user' });
          }
          
          setUser(session?.user ?? null);
          setLoading(false);
          
          // Clean up invalid tokens if there's a user
          if (session?.user) {
            setTimeout(() => clearInvalidTokens(), 500);
          }
        }

        // Set a timeout fallback to prevent infinite loading
        loadingTimeout = setTimeout(() => {
          if (mountedRef.current) {
            logger.warn('Auth loading timeout - forcing loading to false');
            setLoading(false);
          }
        }, 5000);

        return () => {
          subscription.unsubscribe();
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
          }
        };
      } catch (error) {
        if (mountedRef.current) {
          logger.error('Auth initialization error', error);
          setLoading(false);
        }
      }
    };

    const cleanup = initializeAuth();
    
    return () => {
      mountedRef.current = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []); // Remove dependencies to prevent re-initialization

  // Memoized auth functions to prevent unnecessary re-renders
  const signIn = useCallback(async (email: string, password: string) => {
    logger.debug('Attempting to sign in', { email });
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        logger.error('Sign in error', error);
        return { error };
      }
      
      logger.debug('Sign in successful');
      return { error: null };
    } catch (err) {
      logger.error('Sign in catch error', err);
      return { error: err };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string, inviteCode?: string) => {
    logger.debug('Attempting to sign up', { email });
    
    // For normal signups (from login page), require invite code
    // For team invitation signups, inviteCode will be undefined and we skip validation
    if (inviteCode !== undefined && inviteCode !== 'cuer2025') {
      return { error: { message: 'Invalid invite code. Please enter a valid invite code to create an account.' } };
    }
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        }
      }
    })

    if (error) {
      logger.error('Sign up error', error);
    } else {
      logger.debug('Account created successfully - profile will be created by database trigger');
    }
    
    return { error }
  }, []);

  const signOut = useCallback(async () => {
    try {
      logger.debug('Attempting to sign out...')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        logger.error('Server-side logout error', error)
      }
      
      // Clear any pending invitation tokens on logout
      localStorage.removeItem('pendingInvitationToken')
      
      logger.debug('Sign out completed')
      
    } catch (error) {
      logger.error('Logout error', error)
      // Clear local storage even if logout fails
      localStorage.removeItem('pendingInvitationToken')
      logger.debug('User state cleared due to error')
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    return { error }
  }, []);

  const updateProfile = useCallback(async (fullName: string) => {
    if (!user) return { error: { message: 'No user logged in' } }

    // Update auth user metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    })

    if (authError) return { error: authError }

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)

    return { error: profileError }
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error }
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { error }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user, 
    loading, 
    signIn, 
    signUp, 
    signOut, 
    updatePassword, 
    updateProfile, 
    resetPassword, 
    resendConfirmation 
  }), [user, loading, signIn, signUp, signOut, updatePassword, updateProfile, resetPassword, resendConfirmation]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
