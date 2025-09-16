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

  // Everyone gets free tier access by default now
  // Only redirect to subscription page if user explicitly needs a paid subscription
  // and doesn't have any form of access
  if (requiresSubscription) {
    // Allow access for all authenticated users - everyone gets free tier by default
    // Only block if there's a specific error or if access_type is explicitly 'blocked'
    const hasAccess = true; // All authenticated users now have access via free tier
    
    if (!hasAccess) {
      return <Navigate to="/subscription" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute