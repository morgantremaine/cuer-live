import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearInvalidTokens } from '@/utils/invitationUtils'

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

  // Initialize auth state only once
  useEffect(() => {
    console.log('Initializing auth state...');
    
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // Set up auth state listener first
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          console.log('Auth state changed:', event, session?.user?.email || 'no user');
          
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
        
        if (mounted) {
          if (error) {
            console.error('Error getting initial session:', error);
          } else {
            console.log('Initial session:', session?.user?.email || 'no user');
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
          if (mounted) {
            console.log('Auth loading timeout - forcing loading to false');
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
        if (mounted) {
          console.error('Auth initialization error:', error);
          setLoading(false);
        }
      }
    };

    const cleanup = initializeAuth();
    
    return () => {
      mounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []); // Remove dependencies to prevent re-initialization

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('Attempting to sign in:', email);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }
      
      // Success - auth state change will handle the rest
      console.log('Sign in successful');
      return { error: null };
    } catch (err) {
      console.error('Sign in catch error:', err);
      return { error: err };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string, inviteCode?: string) => {
    console.log('Attempting to sign up:', email);
    
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
      console.error('Sign up error:', error);
    } else {
      console.log('Account created successfully - profile will be created by database trigger');
    }
    
    return { error }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('Attempting to sign out...')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Server-side logout error:', error)
      }
      
      // Clear any pending invitation tokens on logout
      localStorage.removeItem('pendingInvitationToken')
      
      console.log('Sign out completed')
      
    } catch (error) {
      console.error('Logout error:', error)
      // Clear local storage even if logout fails
      localStorage.removeItem('pendingInvitationToken')
      console.log('User state cleared due to error')
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
