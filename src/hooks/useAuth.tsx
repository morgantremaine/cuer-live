import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearInvalidTokens } from '@/utils/invitationUtils'
import { logger } from '@/utils/logger'

interface AuthContextType {
  user: User | null
  session: Session | null
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
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    logger.debug('Initializing auth state...')
    
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Auth state changed', { event, userEmail: session?.user?.email || 'no user', hasSession: !!session })
      
      // Set session and user state
      setSession(session)
      setUser(session?.user ?? null)
      
      // Only set loading to false after we've processed the auth state change
      // Add a small delay to ensure Supabase has fully processed the session
      setTimeout(() => {
        setLoading(false)
      }, 100)
      
      // Clean up invalid tokens when user signs in
      if (session?.user && event === 'SIGNED_IN') {
        clearInvalidTokens()
      }
    })

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('Error getting initial session', error)
        setLoading(false)
      } else {
        logger.debug('Initial session retrieved', { userEmail: session?.user?.email || 'no user', hasSession: !!session })
        
        // Only update state if we haven't already set it via the auth state change listener
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Clean up invalid tokens if there's a user
        if (session?.user) {
          clearInvalidTokens()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
    logger.debug('Attempting to sign up', { email })
    
    try {
      // For normal signups (from login page), require invite code
      // For team invitation signups, inviteCode will be undefined and we skip validation
      if (inviteCode !== undefined && inviteCode !== 'cuer2025') {
        return { error: { message: 'Invalid invite code. Please enter a valid invite code to create an account.' } }
      }
      
      const { error } = await supabase.auth.signUp({
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
        logger.error('Sign up error', error)
        return { error }
      }
      
      logger.debug('Account created successfully')
      return { error: null }
    } catch (err) {
      logger.error('Sign up catch error', err)
      return { error: err }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      logger.debug('Attempting to sign out...')
      
      // Clear state immediately
      setUser(null)
      setSession(null)
      
      // Clear any pending invitation tokens
      localStorage.removeItem('pendingInvitationToken')
      
      // Attempt server-side logout
      const { error } = await supabase.auth.signOut()
      if (error) {
        logger.warn('Server-side logout error', error)
      } else {
        logger.debug('Server-side logout successful')
      }
      
      logger.debug('Sign out completed')
      
    } catch (error) {
      logger.error('Logout error', error)
      // Ensure state is cleared even if logout fails
      setUser(null)
      setSession(null)
      localStorage.removeItem('pendingInvitationToken')
    }
  }, [])

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
    session,
    loading, 
    signIn, 
    signUp, 
    signOut, 
    updatePassword, 
    updateProfile, 
    resetPassword, 
    resendConfirmation 
  }), [user, session, loading, signIn, signUp, signOut, updatePassword, updateProfile, resetPassword, resendConfirmation])

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
