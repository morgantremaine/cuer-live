
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

          // Check for pending invitation token
          const pendingToken = localStorage.getItem('pendingInvitationToken')
          
          if (pendingToken && pendingToken !== 'undefined') {
            console.log('Processing pending invitation after authentication')
            
            // Try to accept the invitation
            const { data: acceptResult, error: acceptError } = await supabase.rpc(
              'accept_team_invitation_safe',
              { invitation_token: pendingToken }
            )

            if (acceptError) {
              console.error('Error accepting invitation:', acceptError)
              localStorage.removeItem('pendingInvitationToken')
            } else if (acceptResult?.success) {
              console.log('Invitation accepted successfully')
              localStorage.removeItem('pendingInvitationToken')
              toast({
                title: 'Success',
                description: 'Email confirmed and team invitation accepted! Welcome to the team.',
              })
            } else {
              console.log('Invitation acceptance failed:', acceptResult?.error)
              localStorage.removeItem('pendingInvitationToken')
              toast({
                title: 'Email Confirmed',
                description: 'Your email has been confirmed, but there was an issue with the team invitation.',
              })
            }
          } else {
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
          {isProcessing ? 'Confirming your email...' : 'Processing...'}
        </p>
      </div>
    </div>
  )
}

export default AuthCallback
