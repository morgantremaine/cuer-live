import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearInvalidTokens } from '@/utils/invitationUtils'
import { logger } from '@/utils/logger'
import { authMonitor } from '@/services/AuthMonitor'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any; data: any }>
  signOut: () => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>
  resetPasswordFromEmail: (newPassword: string) => Promise<{ error: any }>
  updateProfile: (fullName: string) => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  resendConfirmation: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

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
      
      // Notify AuthMonitor of auth state changes for realtime coordination
      if (event === 'TOKEN_REFRESHED') {
        authMonitor.onTokenRefreshed(session)
      } else if (event === 'SIGNED_OUT') {
        authMonitor.onSignedOut()
      } else if (event === 'SIGNED_IN' && !isInitialLoad) {
        // Only trigger reconnection for actual sign-ins, not initial session recovery
        authMonitor.onSignedIn(session)
      }
      
      // Mark initial load as complete after first auth state change
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
      
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

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    logger.debug('Attempting to sign up', { email, redirectTo: `${window.location.origin}/auth/callback` })
    
    try {
      const { data, error } = await supabase.auth.signUp({
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
        return { error, data: null }
      }
      
      logger.debug('Sign up response', { 
        user: data.user?.email,
        userConfirmed: data.user?.email_confirmed_at,
        sessionExists: !!data.session,
        identitiesCount: data.user?.identities?.length
      })
      
      // Check if email confirmation is disabled (user will have immediate session)
      if (data.session) {
        logger.debug('User has immediate session - email confirmation appears to be disabled')
      } else {
        logger.debug('No immediate session - email confirmation required')
      }
      
      // Send welcome email for new users (not team invitations)
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            email,
            userName: fullName
          }
        });
        logger.debug('Welcome email sent successfully');
      } catch (emailError) {
        // Don't fail the signup if welcome email fails
        logger.warn('Failed to send welcome email', emailError);
      }
      
      return { error: null, data }
    } catch (err) {
      logger.error('Sign up catch error', err)
      return { error: err, data: null }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      logger.debug('Attempting to sign out...')
      
      // Clear state immediately to prevent further API calls with invalid tokens
      setUser(null)
      setSession(null)
      
      // Clear any pending invitation tokens
      localStorage.removeItem('pendingInvitationToken')
      
      // Clear the session from localStorage to ensure complete logout
      localStorage.removeItem('sb-khdiwrkgahsbjszlwnob-auth-token')
      
      // Attempt server-side logout
      const { error } = await supabase.auth.signOut()
      if (error) {
        // If logout fails due to invalid session (403), that's actually fine
        // since the session is already invalid
        if (error.message?.includes('403') || error.message?.includes('Forbidden') || 
            error.message?.includes('session_not_found')) {
          logger.debug('Session was already invalid - logout completed locally')
        } else {
          logger.warn('Server-side logout error', error)
        }
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
      localStorage.removeItem('sb-khdiwrkgahsbjszlwnob-auth-token')
    }
  }, [])

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    // First verify the current password by attempting to sign in
    if (!user?.email) {
      return { error: { message: 'No user email available' } }
    }
    
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })
    
    if (verifyError) {
      return { error: { message: 'Current password is incorrect' } }
    }
    
    // If verification succeeds, update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { error }
  }, [user]);

  const resetPasswordFromEmail = useCallback(async (newPassword: string) => {
    // This is used when resetting password from email link - no current password verification needed
    const { error } = await supabase.auth.updateUser({
      password: newPassword
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
    resetPasswordFromEmail, 
    updateProfile, 
    resetPassword, 
    resendConfirmation 
  }), [user, session, loading, signIn, signUp, signOut, updatePassword, resetPasswordFromEmail, updateProfile, resetPassword, resendConfirmation])

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
