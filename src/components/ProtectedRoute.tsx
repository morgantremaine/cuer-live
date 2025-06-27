
import { useAuth } from '@/hooks/useAuth'
import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import Footer from '@/components/Footer'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  console.log('ProtectedRoute - loading:', loading, 'user:', user?.email || 'no user', 'location:', location.pathname);

  if (loading) {
    console.log('ProtectedRoute: Showing loading spinner');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <Footer />
      </div>
    )
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login with state:', { from: location });
    // Save the attempted location for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  console.log('ProtectedRoute: User authenticated, rendering children');
  return <>{children}</>
}

export default ProtectedRoute
