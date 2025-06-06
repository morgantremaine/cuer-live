
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Archive, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SavedRundown } from '@/hooks/useRundownStorage/types'
import { useAuth } from '@/hooks/useAuth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DashboardRundownGridProps {
  rundowns: SavedRundown[]
  onDeleteRundown: (id: string) => void
  onArchiveRundown: (id: string) => void
}

const DashboardRundownGrid = ({ rundowns, onDeleteRundown, onArchiveRundown }: DashboardRundownGridProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isOwnRundown = (rundown: SavedRundown) => {
    return rundown.user_id === user?.id
  }

  const getOwnerInfo = (rundown: SavedRundown) => {
    if (isOwnRundown(rundown)) {
      return 'You'
    }
    return rundown.profiles?.full_name || rundown.profiles?.email || 'Team member'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rundowns.map((rundown) => (
        <Card key={rundown.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle 
                  className="text-white text-lg truncate cursor-pointer hover:text-blue-300"
                  onClick={() => navigate(`/rundown/${rundown.id}`)}
                >
                  {rundown.title}
                </CardTitle>
                <CardDescription className="text-gray-400 flex items-center gap-2 mt-1">
                  {!isOwnRundown(rundown) && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="text-xs">by {getOwnerInfo(rundown)}</span>
                    </div>
                  )}
                  <span className="text-xs">
                    Updated {formatDate(rundown.updated_at)}
                  </span>
                </CardDescription>
              </div>
              {!isOwnRundown(rundown) && (
                <Badge variant="secondary" className="ml-2">
                  Team
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/rundown/${rundown.id}`)}
                  className="border-gray-600 hover:bg-gray-700"
                >
                  Open
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/blueprint/${rundown.id}`)}
                  className="border-gray-600 hover:bg-gray-700"
                >
                  Blueprint
                </Button>
              </div>
              
              {/* Only show delete/archive options for own rundowns */}
              {isOwnRundown(rundown) && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onArchiveRundown(rundown.id)}
                    className="text-gray-400 hover:text-yellow-400 hover:bg-gray-700"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 hover:bg-gray-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-800 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Rundown</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          Are you sure you want to delete "{rundown.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDeleteRundown(rundown.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default DashboardRundownGrid
