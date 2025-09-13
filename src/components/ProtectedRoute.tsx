import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import Footer from '@/components/Footer'

interface ProtectedRouteProps {
  children: ReactNode
  requiresSubscription?: boolean
}

const ProtectedRoute = ({ children, requiresSubscription = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth()
  const { subscribed, grandfathered, access_type, loading: subscriptionLoading } = useSubscription()

  // Show loading while auth or subscription is being checked
  if (authLoading || (user && subscriptionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If subscription is required, check subscription status
  if (requiresSubscription) {
    // Allow access if user is subscribed, grandfathered, has team access, or is on free tier
    const hasAccess = subscribed || grandfathered || access_type === 'team_member' || access_type === 'free';
    if (!hasAccess) {
      return <Navigate to="/subscription" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute