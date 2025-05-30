
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useRundownStorage } from '@/hooks/useRundownStorage'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, LogOut, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const { savedRundowns, loading, loadRundowns } = useRundownStorage()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      loadRundowns()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleCreateNew = () => {
    navigate('/rundown')
  }

  const handleOpenRundown = (rundownId: string) => {
    navigate(`/rundown/${rundownId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Rundown Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create New Button */}
        <div className="mb-8">
          <Button onClick={handleCreateNew} size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" />
            Create New Rundown
          </Button>
        </div>

        {/* Rundowns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))
          ) : savedRundowns.length === 0 ? (
            // Empty state
            <div className="col-span-full text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rundowns yet</h3>
              <p className="text-gray-600 mb-4">Create your first rundown to get started</p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Rundown
              </Button>
            </div>
          ) : (
            // Rundowns list
            savedRundowns.map((rundown) => (
              <Card key={rundown.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleOpenRundown(rundown.id)}>
                <CardHeader>
                  <CardTitle className="text-lg">{rundown.title}</CardTitle>
                  <CardDescription className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(new Date(rundown.updated_at), 'MMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {rundown.items?.length || 0} items
                    </div>
                    <Button variant="ghost" size="sm">
                      Open →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
