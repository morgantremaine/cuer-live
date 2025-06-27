
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
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
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return; // Prevent multiple initializations
    
    console.log('Initializing auth state...');
    
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'no user');
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Only clean up invalid tokens when there's actually a user session
      // This prevents clearing tokens during initial auth state determination
      if (session?.user && event === 'SIGNED_IN') {
        // Use a small delay to prevent interference with auth flow
        setTimeout(() => clearInvalidTokens(), 500);
      }
    })

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
      }
      console.log('Initial session:', session?.user?.email || 'no user');
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Only clean up invalid tokens if there's a user
      if (session?.user) {
        setTimeout(() => clearInvalidTokens(), 500);
      }
    })

    setInitialized(true);

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    }
  }, [initialized])

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      console.error('Sign in error:', error);
    }
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string, inviteCode?: string) => {
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

    // Don't try to create profile manually - let the database trigger handle it
    // The handle_new_user() trigger will create the profile automatically
    if (error) {
      console.error('Sign up error:', error);
    } else {
      console.log('Account created successfully - profile will be created by database trigger');
    }
    
    return { error }
  }

  const signOut = async () => {
    try {
      console.log('Attempting to sign out...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Server-side logout error:', error)
      }
      
      // Clear any pending invitation tokens on logout
      localStorage.removeItem('pendingInvitationToken')
      
      // Force clear the user state locally
      setUser(null)
      console.log('User state cleared locally')
      
    } catch (error) {
      console.error('Logout error:', error)
      // Always clear local state even if logout fails
      setUser(null)
      localStorage.removeItem('pendingInvitationToken')
      console.log('User state cleared due to error')
    }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    return { error }
  }

  const updateProfile = async (fullName: string) => {
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
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error }
  }

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { error }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      updatePassword, 
      updateProfile, 
      resetPassword, 
      resendConfirmation 
    }}>
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
