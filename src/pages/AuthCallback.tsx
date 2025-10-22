
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processing auth callback...')
        
        // Get the session first
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          toast({
            title: 'Authentication Error',
            description: error.message,
            variant: 'destructive',
          })
          navigate('/login')
          return
        }

        if (data.session?.user) {
          console.log('User authenticated successfully:', data.session.user.email)

          // Check if this is a new user (created within last 10 seconds)
          const userCreatedAt = new Date(data.session.user.created_at).getTime()
          const now = Date.now()
          const isNewUser = (now - userCreatedAt) < 10000 // 10 seconds

          // Check for pending invitation token but don't process it here
          // Let JoinTeam page handle invitation acceptance for better UX
          const pendingToken = localStorage.getItem('pendingInvitationToken')
          
          if (pendingToken && pendingToken !== 'undefined') {
            console.log('Pending invitation detected, will be processed by JoinTeam page')
            toast({
              title: 'Email Confirmed',
              description: 'Your email has been confirmed! Redirecting to complete team invitation...',
            })
            
            // Navigate to JoinTeam page to handle invitation acceptance
            setTimeout(() => {
              navigate(`/join-team/${pendingToken}`)
            }, 1500)
            return
          } else if (isNewUser) {
            // Only show welcome message for new signups
            toast({
              title: 'Success',
              description: 'Email confirmed successfully! Welcome to Cuer.',
            })
          }

          // Wait longer for auth state to fully settle, then navigate
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        } else {
          console.log('No session found, redirecting to login')
          navigate('/login')
        }
      } catch (error) {
        console.error('Unexpected error during auth callback:', error)
        toast({
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        })
        navigate('/login')
      } finally {
        setIsProcessing(false)
      }
    }

    handleAuthCallback()
  }, [navigate, toast])

  return (
    <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-300">
          Signing you in...
        </p>
      </div>
    </div>
  )
}

export default AuthCallback
