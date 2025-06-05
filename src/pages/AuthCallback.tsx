
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
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

        if (data.session) {
          toast({
            title: 'Success',
            description: 'Email confirmed successfully! Welcome to Cuer.',
          })
          navigate('/dashboard')
        } else {
          // No session, redirect to login
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
      }
    }

    handleAuthCallback()
  }, [navigate, toast])

  return (
    <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-300">Confirming your email...</p>
      </div>
    </div>
  )
}

export default AuthCallback
